(() => {
  'use strict';
  const root = document.getElementById('vb3-chatbot');
  if (!root) return;
  root.innerHTML = `<section class="vb-chat"><h2>🤖 Chatbot IA vendeur</h2><p class="vb-chat-note">Rédige une réponse à un acheteur. Le message et le contexte sont transmis à OpenRouter pour générer la réponse. Aucun historique n'est sauvegardé par ce module.</p><label for="vb-context">Contexte de l'article (facultatif)</label><textarea id="vb-context" maxlength="800" rows="2" placeholder="Ex. Pull Stone Island, taille M, prix affiché 85 €"></textarea><label for="vb-message">Message de l'acheteur ou question</label><textarea id="vb-message" maxlength="1500" rows="3" placeholder="Ex. Bonjour, vous acceptez 70 € ?"></textarea><div class="vb-chat-actions"><button id="vb-send" type="button">Générer une réponse IA</button><button id="vb-copy" type="button" disabled>Copier</button></div><p id="vb-chat-status" role="status" aria-live="polite"></p><div id="vb-chat-result" class="vb-chat-result" aria-live="polite"></div></section>`;
  const get = id => document.getElementById(id);
  const status = get('vb-chat-status');
  get('vb-send').addEventListener('click', async () => {
    const message = get('vb-message').value.trim();
    if (!message) {status.textContent='Écris un message avant de lancer le chatbot.';return;}
    get('vb-send').disabled=true;get('vb-copy').disabled=true;status.textContent='Génération en cours…';get('vb-chat-result').textContent='';
    try {
      if (!window.supabase?.createClient) throw new Error('Bibliothèque de connexion indisponible.');
      const configRes = await fetch('/supabase-config');
      if (!configRes.ok) throw new Error('Configuration de connexion indisponible.');
      const cfg = await configRes.json();
      const client = window.supabase.createClient(cfg.url,cfg.publishableKey);
      const {data:{session},error} = await client.auth.getSession();
      if (error || !session?.access_token) throw new Error("Connecte-toi à FLIZO avant d’utiliser le chatbot.");
      const res = await fetch('/api/v3/chat',{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${session.access_token}`},body:JSON.stringify({message,contexte:get('vb-context').value})});
      const json = await res.json().catch(()=>({}));
      if (!res.ok) throw new Error(json.error || 'Erreur IA.');
      get('vb-chat-result').textContent=json.reponse || '';
      get('vb-copy').disabled=!json.reponse;
      status.textContent='Réponse prête. Vérifie les informations avant de l’envoyer.';
    } catch(e) {status.textContent=e.message || 'Erreur inconnue.';}
    finally {get('vb-send').disabled=false;}
  });
  get('vb-copy').addEventListener('click', async () => {
    try {await navigator.clipboard.writeText(get('vb-chat-result').textContent);status.textContent='Réponse copiée.';}
    catch {status.textContent='Copie impossible : sélectionne le texte manuellement.';}
  });
})();
