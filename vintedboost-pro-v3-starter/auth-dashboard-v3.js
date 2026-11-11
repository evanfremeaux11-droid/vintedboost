(async () => {
    "use strict";

    const nav = document.querySelector("aside.side nav");
    if (!nav) return;

    if (document.getElementById("vb3-auth")) return;

    const zone = document.createElement("div");
    zone.id = "vb3-auth"; zone.setAttribute("aria-label", "Compte VintedBoost");
    zone.style.cssText =
        "padding:16px 12px;margin-top:18px;border-top:1px solid #8884";

    const label = document.createElement("div");
    label.style.cssText =
        "font-size:12px;overflow-wrap:anywhere;margin-bottom:10px";

    const button = document.createElement("button");
    button.type = "button";
    button.style.cssText =
        "width:100%;padding:11px;border:0;border-radius:9px;cursor:pointer;font-weight:700";

    zone.append(label, button);
    const main = document.querySelector("main.main");
if (main) {
    zone.style.cssText = "display:block!important;visibility:visible!important;position:relative!important;padding:16px;margin:12px 0 24px;border:1px solid #7c3aed;border-radius:12px;background:#f5f3ff;color:#22143d;max-width:400px";
    button.style.cssText = "display:block!important;visibility:visible!important;width:100%;padding:12px;background:#7c3aed;color:white;border:0;border-radius:9px;cursor:pointer;font-weight:700";
    main.prepend(zone);
} else {
    nav.append(zone);
}

    const dialog = document.createElement("dialog");
    dialog.style.cssText =
        "border:1px solid #ddd6fe;border-radius:16px;padding:24px;max-width:400px;width:calc(100% - 32px)";

    const form = document.createElement("form");

    form.innerHTML = `
        <h2>Connexion VintedBoost</h2>
        <label>Adresse e-mail
            <input type="email" required autocomplete="email"
                style="display:block;width:100%;padding:10px;margin:10px 0">
        </label>
        <label>Mot de passe
            <input type="password" required autocomplete="current-password"
                style="display:block;width:100%;padding:10px;margin:10px 0">
        </label>
        <p role="alert" style="color:#b91c1c"></p>
        <button type="button" id="vb3-cancel">Annuler</button>
        <button type="submit">Se connecter</button>
<button type="button" id="vb3-signup"
    style="margin-top:12px;padding:10px;background:#7c3aed;color:white;border:0;border-radius:8px;cursor:pointer">
    Créer un compte
</button>
    `;

    dialog.append(form);
    document.body.append(dialog);

    const email = form.querySelector('[type="email"]');
    const password = form.querySelector('[type="password"]');
    const errorText = form.querySelector('[role="alert"]');

    form.querySelector("#vb3-cancel").onclick = () => dialog.close();
form.querySelector("#vb3-signup").onclick = async () => {
    errorText.textContent = "";

    if (!email.value.trim() || !password.value) {
        errorText.textContent = "Renseigne ton e-mail et ton mot de passe.";
        return;
    }

    const signupButton = form.querySelector("#vb3-signup");
    signupButton.disabled = true;

    try {
        const client = await window.getVintedBoostSupabase();

        const { data, error } = await client.auth.signUp({
            email: email.value.trim(),
            password: password.value
        });

        if (error) throw error;

        password.value = "";

        if (data.session) {
            dialog.close();
            window.dispatchEvent(new Event("vb3-auth-changed"));
        } else {
            errorText.style.color = "#16a34a";
            errorText.textContent =
                "Inscription demandée. Vérifie ton e-mail pour confirmer ton compte si nécessaire.";
        }
    } catch (error) {
        errorText.style.color = "#b91c1c";
        errorText.textContent = error.message || "Inscription impossible.";
    } finally {
        signupButton.disabled = false;
    }
};

    function display(message, action, callback) {
        label.textContent = message;
        button.textContent = action;
        button.disabled = !callback;
        button.onclick = callback;
    }

    display("Chargement...", "Patientez", null);

    try {
        const client = await window.getVintedBoostSupabase();

        async function refresh() {
            const { data, error } = await client.auth.getSession();
            if (error) throw error;

            if (data.session?.user) {
                display(
                    data.session.user.email || "Compte connecte",
                    "Se deconnecter",
                    async () => {
                        button.disabled = true;
                        const { error } = await client.auth.signOut();

                        if (error) {
                            errorText.textContent = error.message;
                            await refresh();
                            return;
                        }

                        await refresh();
                        window.dispatchEvent(new Event("vb3-auth-changed"));
                    }
                );
            } else {
                display("Aucun compte connecte", "Se connecter", () => {
                    errorText.textContent = "";
                    password.value = "";
                    dialog.showModal();
                });
            }
        }

        form.addEventListener("submit", async event => {
            event.preventDefault();

            const submit = form.querySelector('[type="submit"]');
            submit.disabled = true;
            errorText.textContent = "";

            try {
                const { error } = await client.auth.signInWithPassword({
                    email: email.value.trim(),
                    password: password.value
                });

                if (error) throw error;

                password.value = "";
                dialog.close();

                await refresh();
                window.dispatchEvent(new Event("vb3-auth-changed"));
            } catch (error) {
                errorText.textContent =
                    error.message || "Connexion impossible";
            } finally {
                submit.disabled = false;
            }
        });

        await refresh();

        client.auth.onAuthStateChange(() => {
            setTimeout(() => refresh().catch(console.error), 0);
        });

    } catch (error) {
        console.error("Authentification V3 :", error);

        display("Connexion indisponible", "Reessayer", () => {
            location.reload();
        });
    }
})();
