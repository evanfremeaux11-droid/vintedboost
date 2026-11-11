(async function () {
  const metric = document.getElementById("vb3-credits");
  const status = document.getElementById("vb3-account");

  function afficher(message, credits = "—") {
    status.textContent = message;
    metric.textContent = credits;
  }

  try {
    afficher("Connexion à Supabase...");

    const client = await window.getVintedBoostSupabase();

    async function actualiser() {
      const { data: { session }, error: sessionError } =
        await client.auth.getSession();

      if (sessionError) throw sessionError;

      if (!session?.user) {
        afficher("Non connecté — connecte-toi depuis le générateur");
        return;
      }

      afficher("Compte : " + (session.user.email || "Connecté"));

      const { data, error } = await client
        .from("profiles")
        .select("generations_used, generations_limit")
        .eq("id", session.user.id)
        .single();

      if (error) throw error;

      const used = Number(data.generations_used);
      const limit = Number(data.generations_limit);

      if (!Number.isFinite(used) || !Number.isFinite(limit)) {
        throw new Error("Quota invalide");
      }

      afficher(
        "Compte : " + (session.user.email || "Connecté"),
        Math.max(0, limit - used) + " / " + limit
      );
    }

    await actualiser();

    client.auth.onAuthStateChange(() => {
      setTimeout(() => {
        actualiser().catch(err => {
          console.error(err);
          afficher("Impossible de charger les crédits");
        });
      }, 0);
    });

  } catch (error) {
    console.error("VintedBoost V3 :", error);
    afficher("Erreur de connexion Supabase");
  }
})();