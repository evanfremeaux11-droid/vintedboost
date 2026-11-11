(() => {
  'use strict';
  const main = document.querySelector('main.main');
  if (!main || document.getElementById('trackerV3')) return;
  const css = document.createElement('style');
  css.textContent = `
  #trackerV3{margin-top:24px}#trackerV3 *{box-sizing:border-box}
  #trackerV3 .trkHead{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap}
  #trackerV3 .trkTabs{display:flex;gap:5px;background:#171123;padding:4px;border-radius:12px}
  #trackerV3 button,#trackerV3 select,#trackerV3 input{font:inherit}
  #trackerV3 .trkTab,#trackerV3 .trkBtn{padding:9px 12px;border-radius:9px;border:1px solid #654b83;background:#2d2042;color:#f2e9ff;cursor:pointer}
  #trackerV3 .trkTab[aria-pressed=true]{background:#7545b4}
  #trackerV3 .trkPanel{margin-top:16px;min-height:100px}
  #trackerV3 .trkEmpty{padding:24px;border:1px dashed #665080;border-radius:12px;color:#cdbbe2;text-align:center}
  #trackerV3 .trkMetrics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;margin-top:16px}
  #trackerV3 .trkMetric{background:#20162f;border:1px solid #4d366a;border-radius:12px;padding:14px}
  #trackerV3 .trkMetric strong{display:block;font-size:19px;margin-top:5px;color:#fff}
  #trackerV3 .trkScroll{overflow-x:auto}#trackerV3 table{width:100%;min-width:680px;border-collapse:collapse;color:#eee6f8}
  #trackerV3 th,#trackerV3 td{padding:11px 8px;text-align:left;border-bottom:1px solid #443455}
  #trackerV3 th{font-size:12px;color:#c2a8df}#trackerV3 .trkSmall{font-size:12px;color:#bfa9d5}
  #trackerV3 .trkBars{display:flex;align-items:end;gap:12px;min-height:150px;overflow-x:auto;padding:15px 0}
  #trackerV3 .trkBarItem{flex:1;min-width:95px;text-align:center;font-size:12px}
  #trackerV3 .trkBarTrack{height:110px;display:flex;align-items:end;justify-content:center;gap:5px}
  #trackerV3 .trkBar{width:25px;min-height:3px;border-radius:5px 5px 0 0;background:#a56aef}
  #trackerV3 .trkBar.trkSale{background:#57b6a3}#trackerV3 .trkLabel{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  #trackerV3 .trkChart{width:100%;height:180px;display:block}
  #trackerV3 .trkEdit{margin-top:16px;padding:16px;border:1px solid #654b83;border-radius:12px;background:#20162f}
  #trackerV3 .trkFields{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
  #trackerV3 .trkFields label{display:flex;flex-direction:column;gap:6px;font-size:13px}
  #trackerV3 .trkFields input,#trackerV3 .trkFields select{width:100%;min-width:0;padding:9px;border-radius:8px;border:1px solid #665080;background:#130d20;color:white}
  #trackerV3 .trkActions{display:flex;gap:8px;margin-top:12px;flex-wrap:wrap}
  #trackerV3 .trkFilters{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-top:16px;color:#d7c5ec;font-size:13px}
  #trackerV3 .trkFilters input,#trackerV3 .trkFilters select{background:#20162f;color:#fff;border:1px solid #665080;border-radius:9px;padding:10px;max-width:100%;min-width:0}
  #trackerV3 .trkFilters input{flex:1;min-width:150px}
  #trackerV3 #trkCount{font-size:12px;color:#bfa9d5}
  #trackerV3 .trkNote{font-size:12px;color:#cbbde3;margin-top:10px}
  @media(max-width:600px){#trackerV3 .trkMetrics{grid-template-columns:1fr}#trackerV3 .trkFields{grid-template-columns:1fr}#trackerV3 .trkTab{padding:8px;font-size:12px}}
  `;
  document.head.appendChild(css);
  const section = document.createElement('section');
  section.id = 'trackerV3';section.className = 'section card';
  section.innerHTML = `<div class="trkHead"><div><h2>📦 Mes vêtements</h2><p>Stock, ventes et rentabilité réelle.</p></div><div class="trkTabs" role="group" aria-label="Affichage du suivi"><button class="trkTab" data-view="list" aria-pressed="true">Liste</button><button class="trkTab" data-view="bar" aria-pressed="false">Barres</button><button class="trkTab" data-view="line" aria-pressed="false">Courbe</button></div></div><div class="trkFilters" role="search" aria-label="Rechercher mes vêtements"><label for="trkSearch">Rechercher un vêtement</label><input id="trkSearch" type="search" placeholder="Nom ou marque…" autocomplete="off"><label for="trkStatus">Statut</label><select id="trkStatus"><option value="all">Tous les statuts</option><option value="stock">En stock</option><option value="listed">En vente</option><option value="sold">Vendus</option></select><span id="trkCount" aria-live="polite"></span></div><div class="trkMetrics" id="trkMetrics"></div><div class="trkPanel" id="trkPanel" aria-live="polite"></div><div id="trkEditor"></div>`;
  main.appendChild(section);
  const panel=section.querySelector('#trkPanel'),metrics=section.querySelector('#trkMetrics'),editor=section.querySelector('#trkEditor');
  const tabs=[...section.querySelectorAll('.trkTab')];
  const euro=n=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(n);
  const num=n=>Number(n||0);
  const expense=x=>num(x.purchase_price)+num(x.extra_costs);
  const sold=x=>x.status==='sold'&&x.sale_price!=null;
  const profit=x=>num(x.sale_price)-expense(x);
  let rows=[],view='list',client=null,userId=null,busy=false;
  const searchInput=section.querySelector('#trkSearch'),statusInput=section.querySelector('#trkStatus'),countNode=section.querySelector('#trkCount');
  const visibleRows=()=>rows.filter(x=>{
    const query=searchInput.value.trim().toLocaleLowerCase('fr');
    return (statusInput.value==='all'||x.status===statusInput.value)&&(!query||`${x.name||''} ${x.brand||''}`.toLocaleLowerCase('fr').includes(query));
  });
  searchInput.addEventListener('input',()=>{editor.replaceChildren();render();});
  statusInput.addEventListener('change',()=>{editor.replaceChildren();render();});
  const node=(tag,cls,txt)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(txt!==undefined)e.textContent=txt;return e;};
  const empty=txt=>panel.appendChild(node('div','trkEmpty',txt));
  const sum=xs=>xs.reduce((a,b)=>a+b,0);
  function renderMetrics(){
    metrics.replaceChildren();
    const invested=sum(rows.map(expense));
    const revenue=sum(rows.filter(sold).map(x=>num(x.sale_price)));
    const gains=sum(rows.filter(sold).map(profit));
    [['Articles',String(rows.length)],['Dépenses enregistrées',euro(invested)],['Bénéfices réalisés',euro(gains)]].forEach(([label,value])=>{
      const c=node('div','trkMetric');c.append(node('span','trkSmall',label),node('strong','',value));metrics.append(c);
    });
    const note=node('p','trkNote',`Chiffre d'affaires réalisé : ${euro(revenue)}. Les dépenses comprennent les articles non vendus ; le bénéfice réalisé concerne uniquement les ventes.`);
    metrics.append(note);
  }
  function renderList(){
    const displayed=visibleRows();
    if(!displayed.length){empty(rows.length?'Aucun vêtement ne correspond à ta recherche.':'Aucun vêtement enregistré. Ajoute un article depuis le Studio IA.');return;}
    const wrap=node('div','trkScroll'),table=node('table');
    const hr=table.createTHead().insertRow();
    ['Vêtement','Statut','Dépenses','Vente','Bénéfice','Action'].forEach(t=>hr.appendChild(node('th','',t)));
    const body=table.createTBody();
    displayed.forEach(x=>{
      const tr=body.insertRow();
      const cell=t=>tr.insertCell().textContent=t;
      cell(x.name||'Article');cell(({stock:'En stock',listed:'En vente',sold:'Vendu'})[x.status]||x.status);
      cell(euro(expense(x)));cell(sold(x)?euro(x.sale_price):'—');cell(sold(x)?euro(profit(x)):'—');
      const td=tr.insertCell(),btn=node('button','trkBtn','Modifier');btn.type='button';btn.addEventListener('click',()=>edit(x.id));td.appendChild(btn);
    });
    wrap.appendChild(table);panel.appendChild(wrap);
  }
  function renderBars(){
    if(!rows.length){empty('Ajoute un vêtement pour voir les dépenses.');return;}
    const display=rows.slice(0,12),max=Math.max(1,...display.flatMap(x=>[expense(x),sold(x)?num(x.sale_price):0]));
    const wrap=node('div','trkBars');
    display.forEach(x=>{
      const item=node('div','trkBarItem'),track=node('div','trkBarTrack');
      const cost=node('div','trkBar');cost.style.height=`${Math.max(3,expense(x)/max*105)}px`;cost.title=`Dépenses : ${euro(expense(x))}`;track.appendChild(cost);
      if(sold(x)){const sale=node('div','trkBar trkSale');sale.style.height=`${Math.max(3,num(x.sale_price)/max*105)}px`;sale.title=`Vente : ${euro(x.sale_price)}`;track.appendChild(sale);}
      const label=node('div','trkLabel',x.name||'Article');label.title=x.name||'Article';
      item.append(node('div','trkSmall',euro(expense(x))),track,label);wrap.appendChild(item);
    });
    panel.append(wrap,node('p','trkNote','Violet : dépenses (achat + frais). Vert : prix de vente des articles vendus. 12 derniers articles maximum.'));
  }
  function renderLine(){
    if(!rows.length){empty('Ajoute un vêtement pour afficher la courbe des dépenses.');return;}
    const sorted=[...rows].sort((a,b)=>new Date(a.created_at||0)-new Date(b.created_at||0));
    let expenses=0,revenue=0;const data=sorted.map(x=>{expenses+=expense(x);if(sold(x))revenue+=num(x.sale_price);return {cost:expenses,revenue};});
    const values=data.flatMap(x=>[x.cost,x.revenue]),min=Math.min(0,...values),max=Math.max(1,...values),range=max-min;
    const ns='http://www.w3.org/2000/svg',svg=document.createElementNS(ns,'svg');
    svg.setAttribute('viewBox','0 0 600 230');svg.setAttribute('class','trkChart');svg.setAttribute('role','img');svg.setAttribute('aria-label','Dépenses cumulées et ventes cumulées par ordre de création des articles');
    const points=key=>data.map((v,i)=>`${35+(data.length===1?265:i*530/(data.length-1))},${190-(v[key]-min)/range*150}`).join(' ');
    [['cost','#b783ff'],['revenue','#57b6a3']].forEach(([key,color])=>{
      const line=document.createElementNS(ns,'polyline');line.setAttribute('points',points(key));line.setAttribute('fill','none');line.setAttribute('stroke',color);line.setAttribute('stroke-width','4');line.setAttribute('stroke-linecap','round');svg.appendChild(line);
      if(data.length===1){const circle=document.createElementNS(ns,'circle');circle.setAttribute('cx','300');circle.setAttribute('cy',String(190-(data[0][key]-min)/range*150));circle.setAttribute('r','5');circle.setAttribute('fill',color);svg.appendChild(circle);}
    });
    panel.append(svg,node('p','trkNote','Violet : dépenses cumulées. Vert : chiffre d’affaires des articles vendus. Ordre de création des articles, et non chronologie exacte des ventes.'));
  }
  function render(){panel.replaceChildren();countNode.textContent=`${visibleRows().length} / ${rows.length} articles · Filtres appliqués à la liste`;tabs.forEach(t=>t.setAttribute('aria-pressed',String(t.dataset.view===view)));renderMetrics();if(view==='bar')renderBars();else if(view==='line')renderLine();else renderList();}
  tabs.forEach(t=>t.addEventListener('click',()=>{view=t.dataset.view;editor.replaceChildren();render();}));
  function edit(id){
    const x=rows.find(r=>r.id===id);if(!x)return;
    editor.replaceChildren();const form=node('form','trkEdit');
    const title=node('h3','',`Modifier : ${x.name||'Article'}`),fields=node('div','trkFields');
    const field=(label,type,value,options)=>{
      const wrap=node('label');wrap.appendChild(node('span','',label));
      let input;if(options){input=node('select');options.forEach(([v,t])=>{const o=node('option','',t);o.value=v;input.appendChild(o);});}
      else{input=node('input');input.type=type;if(type==='number'){input.min='0';input.step=label.includes('minutes')?'1':'0.01';}if(type==='date')input.max='9999-12-31';}
      input.value=value==null?'':String(value);wrap.appendChild(input);fields.appendChild(wrap);return input;
    };
    const status=field('Statut','',x.status,[['stock','En stock'],['listed','En vente'],['sold','Vendu']]);
    const purchase=field("Prix d'achat (€)",'number',x.purchase_price),extra=field('Autres frais (€)','number',x.extra_costs);
    const sale=field('Prix de vente (€)','number',x.sale_price),minutes=field('Temps passé (minutes)','number',x.work_minutes);
    const soldDate=field('Date de vente','date',x.sold_at?x.sold_at.slice(0,10):'');
    const listedDate=field('Date de mise en vente','date',x.listed_at?x.listed_at.slice(0,10):'');
    const actions=node('div','trkActions'),save=node('button','trkBtn','Enregistrer les modifications'),cancel=node('button','trkBtn','Annuler'),message=node('p','trkNote','');
    save.type='submit';cancel.type='button';cancel.addEventListener('click',()=>editor.replaceChildren());actions.append(save,cancel);form.append(title,fields,actions,message);editor.appendChild(form);
    form.scrollIntoView({behavior:'smooth',block:'nearest'});
    form.addEventListener('submit',async event=>{
      event.preventDefault();if(busy)return;
      const number=(el,optional=false)=>el.value.trim()===''?(optional?null:0):Number(el.value);
      const p=number(purchase,true),e=number(extra),s=number(sale,true),m=number(minutes);
      if([p,e,s,m].some(v=>v!==null&&(!Number.isFinite(v)||v<0))||!Number.isInteger(m)){message.textContent='Vérifie les montants et les minutes.';return;}
      if(status.value==='sold'&&(s===null||!soldDate.value)){message.textContent='Pour marquer vendu, indique le prix et la date de vente.';return;}
      if(listedDate.value&&soldDate.value&&soldDate.value<listedDate.value){message.textContent='La date de vente doit être postérieure à la mise en vente.';return;}
      const payload={status:status.value,purchase_price:p,extra_costs:e,sale_price:status.value==='sold'?s:null,work_minutes:m,listed_at:listedDate.value?`${listedDate.value}T12:00:00Z`:null,sold_at:status.value==='sold'?`${soldDate.value}T12:00:00Z`:null,updated_at:new Date().toISOString()};
      busy=true;save.disabled=true;message.textContent='Enregistrement...';
      try{
        const {data:{user},error:authError}=await client.auth.getUser();if(authError||!user||user.id!==userId)throw new Error('Session expirée : reconnecte-toi.');
        const {data,error}=await client.from('v3_clothing_tracker').update(payload).eq('id',id).eq('user_id',userId).select('id');
        if(error)throw error;if(!data||data.length!==1)throw new Error('Modification non confirmée par Supabase.');
        Object.assign(x,payload);editor.replaceChildren();render();
      }catch(err){message.textContent='Erreur : '+(err.message||'Enregistrement impossible');save.disabled=false;}
      finally{busy=false;}
    });
  }
  async function start(){
    empty('Chargement de tes vêtements...');
    try{
      client = await window.getVintedBoostSupabase();
      const {data:{session},error:authError}=await client.auth.getSession();if(authError)throw authError;
      if(!session?.user){panel.replaceChildren();empty('Connecte-toi depuis le Studio IA pour voir tes vêtements.');return;}
      userId=session.user.id;
      const {data,error}=await client.from('v3_clothing_tracker').select('*').eq('user_id',userId).order('created_at',{ascending:false}).limit(500);
      if(error)throw error;rows=data||[];render();
    }catch(err){console.error("FLIZO Tracker V3",err);panel.replaceChildren();empty('Impossible de charger le suivi : '+(err.message||'Erreur inconnue'));}
  }
  start();
})();
