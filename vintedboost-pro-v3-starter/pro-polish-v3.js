(()=>{
'use strict';
if(window.__vb3PolishLoaded)return;window.__vb3PolishLoaded=true;
const ready=()=>{
 const main=document.querySelector('main.main');if(!main)return;
 main.id=main.id||'contenu-principal';main.setAttribute('tabindex','-1');
 const skip=document.createElement('a');skip.href='#contenu-principal';skip.className='vb3-skip';skip.textContent='Aller au contenu';document.body.prepend(skip);
 const nav=document.querySelector('.side nav');if(nav){
   const links=[...nav.querySelectorAll('a[href]')];
   const groups=[['ESPACE VENDEUR',['index.html','/studio-v3','dressing.html','prix.html']],['ANALYSE ET CONSEILS',['analytics.html','assistant.html']],['MON ESPACE',['parametres.html','aide.html']]];
   for(const [label,hrefs] of groups){const first=links.find(a=>hrefs.includes(a.getAttribute('href')));if(first){const t=document.createElement('span');t.className='vb3-nav-label';t.textContent=label;nav.insertBefore(t,first)}}
   if(!links.some(a=>a.getAttribute('href')==='aide.html')){const a=document.createElement('a');a.href='aide.html';a.textContent='ⓘ  Centre d’aide';nav.append(a)}
   const path=location.pathname.split('/').pop()||'index.html';
   for(const a of nav.querySelectorAll('a')){if(a.getAttribute('href')===path){a.classList.add('active');a.setAttribute('aria-current','page')}else a.removeAttribute('aria-current')}
 }
 const h1=main.querySelector('h1');if(h1&&!main.querySelector('.vb3-topbar')){
   const bar=document.createElement('div');bar.className='vb3-topbar';
   const tag=document.createElement('span');tag.className='vb3-tag';tag.textContent='✦ Espace vendeur V3';
   const help=document.createElement('a');help.className='vb3-toplink';help.href='/pro-v3/aide.html';help.textContent='Besoin d’aide ?';
   bar.append(tag,help);h1.before(bar);
 }
 const path=location.pathname.split('/').pop()||'index.html';
 if(path==='index.html'&&!document.querySelector('.vb3-shortcuts')){
   const shortcuts=document.createElement('section');shortcuts.className='vb3-shortcuts';shortcuts.setAttribute('aria-label','Accès rapides');
   const items=[
    ['/studio-v3','✦ Studio IA','Créer des annonces à partir de tes photos','Créer une annonce →'],
    ['dressing.html','▦ Mon dressing','Retrouver les articles suivis et leurs statuts','Voir mes articles →'],
    ['analytics.html','◫ Statistiques','Analyser tes ventes et ta rentabilité réelle','Voir les statistiques →'],
    ['assistant.html','◉ Assistant vendeur','Préparer des réponses aux acheteurs','Ouvrir l’assistant →']
   ];
   for(const [href,title,desc,cta] of items){const a=document.createElement('a');a.href=href;a.className='vb3-shortcut';for(const [tag,txt] of [['strong',title],['span',desc],['b',cta]]){const el=document.createElement(tag);el.textContent=txt;a.append(el)}shortcuts.append(a)}
   const grid=main.querySelector('.grid');if(grid)grid.before(shortcuts);else main.append(shortcuts);
 }
 if(!main.querySelector('.vb3-footer')){
  const foot=document.createElement('footer');foot.className='vb3-footer';
  const parts=[["FLIZO V3",null],['Aide','/pro-v3/aide.html'],['Contact','/contact.html'],['Confidentialité','/politique-confidentialite.html'],['Mentions légales','/mentions-legales.html']];
  for(const [txt,url] of parts){const e=document.createElement(url?'a':'span');e.textContent=txt;if(url)e.href=url;foot.append(e)}main.append(foot);
 }
};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
})();