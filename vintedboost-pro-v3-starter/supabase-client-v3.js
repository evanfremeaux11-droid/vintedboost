(() => {
  "use strict";

  let clientPromise = null;

  window.getVintedBoostSupabase = function () {
    if (clientPromise) return clientPromise;

    clientPromise = (async () => {
      if (!window.supabase?.createClient) {
        throw new Error("Bibliothèque Supabase indisponible");
      }

      const response = await fetch("/supabase-config", {
        cache: "no-store"
      });

      if (!response.ok) {
        throw new Error("Configuration Supabase indisponible");
      }

      const config = await response.json();

      if (!config.url || !config.publishableKey) {
        throw new Error("Configuration Supabase incomplète");
      }

      return window.supabase.createClient(
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
    })().catch(error => {
      clientPromise = null;
      throw error;
    });

    return clientPromise;
  };
})();
