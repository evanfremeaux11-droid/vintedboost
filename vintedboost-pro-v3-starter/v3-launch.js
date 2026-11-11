(async function () {
    "use strict";

    const count = document.getElementById("vb3-launch-count");
    if (!count) return;

    async function refresh() {
        try {
            if (typeof window.getVintedBoostSupabase !== "function") {
                throw new Error("Client Supabase indisponible");
            }

            const client = await window.getVintedBoostSupabase();

            const { data, error } = await client.auth.getSession();
            if (error) throw error;

            const user = data.session?.user;

            if (!user) {
                count.textContent = "Connecte-toi pour voir tes articles";
                return;
            }

            const result = await client
                .from("v3_clothing_tracker")
                .select("id", { count: "exact", head: true })
                .eq("user_id", user.id);

            if (result.error) throw result.error;

            const total = result.count ?? 0;

            count.textContent =
                total + (total > 1
                    ? " articles enregistres"
                    : " article enregistre");

        } catch (error) {
            console.error("Dashboard V3 :", error);
            count.textContent =
                "Statistiques indisponibles pour le moment";
        }
    }

    await refresh();

    try {
        const client = await window.getVintedBoostSupabase();

        client.auth.onAuthStateChange(() => {
            setTimeout(() => refresh().catch(console.error), 0);
        });
    } catch (error) {
        console.error("Session V3 :", error);
    }

    window.addEventListener("vb3-auth-changed", () => {
        refresh().catch(console.error);
    });
})();