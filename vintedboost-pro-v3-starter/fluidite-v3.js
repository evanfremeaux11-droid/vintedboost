(() => {
  'use strict';
  function setup() {
    const chat = document.getElementById('vb3-chatbot');
    const legacy = document.getElementById('vb3-app');
    if (!chat || !legacy || document.getElementById('vb3-guided-panel')) return;
    const main = chat.closest('main');
    if (!main) return;
    main.classList.add('vb3-assistant-polished');
    const section = document.createElement('section');
    section.id = 'vb3-guided-panel';
    section.className = 'vb3-guided-panel';
    const details = document.createElement('details');
    details.className = 'vb3-guided-details';
    const summary = document.createElement('summary');
    summary.textContent = 'Réponses rapides sans IA';
    summary.setAttribute('aria-label', 'Afficher les réponses rapides sans IA');
    const help = document.createElement('p');
    help.className = 'vb3-guided-help';
    help.textContent = 'Utilise les modèles guidés pour préparer une réponse sans appeler l’IA.';
    legacy.parentNode.insertBefore(section, legacy);
    section.appendChild(details);
    details.appendChild(summary);
    details.appendChild(help);
    details.appendChild(legacy);
    section.parentNode.insertBefore(chat, section);
    chat.classList.add('vb3-chat-primary');
    const heading = main.querySelector('h1');
    if (heading) heading.textContent = 'Assistant vendeur IA';
    const intro = main.querySelector('.vb-intro');
    if (intro) intro.textContent = 'Réponds aux acheteurs plus facilement, négocie avec tact et gagne du temps.';
    const message = document.getElementById('vb-message');
    if (message) {
      message.setAttribute('autocomplete', 'off');
      message.addEventListener('keydown', e => {
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
          e.preventDefault();
          document.getElementById('vb-send')?.click();
        }
      });
    }
    const send = document.getElementById('vb-send');
    if (send) send.textContent = '✨ Générer ma réponse';
    const result = document.getElementById('vb-chat-result');
    if (result) result.setAttribute('aria-label', 'Réponse générée par l’intelligence artificielle');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', setup, {once:true});
  else setup();
})();
