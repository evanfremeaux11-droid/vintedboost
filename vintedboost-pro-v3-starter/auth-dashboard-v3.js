(async () => {
  "use strict";

  const nav = document.querySelector("aside.side nav");
  if (!nav) return;

  const zone = document.createElement("div");
  zone.id = "vb3-auth";
  zone.style.cssText = "padding:16px 12px;margin-top:18px;border-top:1px solid rgba(128,128,128,.25)";

  const compte = document.createElement("div");
  compte.style.cssText = "font-size:12px;overflow-wrap:anywhere;margin-bottom:10px;opacity:.8";

  const bouton = document.createElement("button");
  bouton.type = "button";
  bouton.style.cssText = "width:100%;padding:11px;border:0;border-radius:9px;cursor:pointer;font-weight:700";

  zone.append(compte, bouton);
  nav.after(zone);

  function afficher(message, titre, action, disabled = false) {
    compte.textContent = message;
    bouton.textContent = titre;
    bouton.disabled = disabled;
    bouton.onclick = action;
  }

  afficher("Verification de la session...", "Chargement...", null, true);

  try {
    if (!window.supabase?.createClient) {
      throw new Error("Bibliotheque Supabase indisponible");
    }

    const response = await fetch("/supabase-config", { cache: "no-store" });
    if (!response.ok) throw new Error("Configuration Supabase indisponible");

    const config = await response.json();
    if (!config.url || !config.publishableKey) {
      throw new Error("Configuration Supabase incomplete");
    }

    const client = window.supabase.createClient(
      config.url,
      config.publishableKey,
      {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      }
    );

    async function actualiser() {
      const { data, error } = await client.auth.getSession();
      if (error) throw error;

      const user = data.session?.user;

      if (user) {
        afficher(user.email || "Compte connecte", "Se deconnecter", async () => {
          bouton.disabled = true;
          const { error } = await client.auth.signOut();

          if (error) {
            alert("Deconnexion impossible : " + error.message);
            bouton.disabled = false;
            return;
          }

          await actualiser();
        });
      } else {
        afficher("Aucun compte connecte", "Se connecter", () => {
          window.location.href = "/studio-v3";
        });
      }
    }

    await actualiser();

    client.auth.onAuthStateChange(() => {
      setTimeout(() => {
        actualiser().catch(console.error);
      }, 0);
    });

  } catch (error) {
    console.error("Authentification Dashboard V3 :", error);
    afficher("Connexion indisponible", "Ouvrir le Studio IA", () => {
      window.location.href = "/studio-v3";
    });
  }
})();