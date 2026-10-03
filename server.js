const express = require("express");







require("dotenv").config();















const { createClient } = require("@supabase/supabase-js");







const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);







const supabaseAdmin = createClient(







    process.env.SUPABASE_URL,







    process.env.SUPABASE_SERVICE_ROLE_KEY







);







const app = express();















/* ======================================================







   VINTEDBOOST V9







\====================================================== */















app.set("trust proxy", 1);







app.post(







    "/stripe-webhook",







    express.raw({ type: "application/json" }),







    async (req, res) => {







        let event;















        try {







            event = stripe.webhooks.constructEvent(







                req.body,







                req.headers["stripe-signature"],







                process.env.STRIPE_WEBHOOK_SECRET







            );







        } catch (error) {







            console.error("❌ WEBHOOK STRIPE :", error.message);







            return res.status(400).send("Webhook invalide");







        }















        try {







            if (event.type === "checkout.session.completed") {







                const session = event.data.object;







                const userId = session.metadata?.supabase_user_id;















                if (userId) {







       const { error } = await supabaseAdmin







    .from("profiles")







    .update({







        plan: "premium",







        stripe_subscription_id: session.subscription,







        stripe_customer_id: session.customer







    })







    .eq("id", userId);















                    if (error) {







                        throw error;







                    }















// Analytics : mémorise le passage Premium une seule fois par abonnement Stripe

                    try {

                        const premiumEventId = "stripe:" + String(session.subscription || "");



                        const { data: premiumExisting, error: premiumReadError } =

                            await supabaseAdmin

                                .from("analytics_events")

                                .select("visitor_id")

                                .eq("event_name", "premium")

                                .eq("visitor_id", premiumEventId)

                                .limit(1);



                        if (premiumReadError) throw premiumReadError;



                        if (!premiumExisting || premiumExisting.length === 0) {

                            const { error: premiumInsertError } =

                                await supabaseAdmin

                                    .from("analytics_events")

                                    .insert({

                                        event_name: "premium",

                                        visitor_id: premiumEventId

                                    });



                            if (premiumInsertError) throw premiumInsertError;

                        }

                    } catch (analyticsError) {

                        // Les statistiques ne doivent jamais empêcher l'activation Premium.

                        console.error("Erreur analytics Premium :", analyticsError.message);

                    }



                    console.log("⭐ Compte Premium activé :", userId);







                }







            }







if (event.type === "customer.subscription.deleted") {







    const subscription = event.data.object;















    const { error } = await supabaseAdmin







        .from("profiles")







        .update({







            plan: "free",







            stripe_subscription_id: null







        })







        .eq("stripe_subscription_id", subscription.id);















    if (error) {







        throw error;







    }















    // Analytics : mémorise la résiliation une seule fois par abonnement Stripe
    try {
        const cancellationEventId = "stripe_cancelled:" + String(subscription.id || "");
        const { data: cancellationExisting, error: cancellationReadError } =
            await supabaseAdmin
                .from("analytics_events")
                .select("visitor_id")
                .eq("event_name", "premium_cancelled")
                .eq("visitor_id", cancellationEventId)
                .limit(1);

        if (cancellationReadError) throw cancellationReadError;

        if (!cancellationExisting || cancellationExisting.length === 0) {
            const { error: cancellationInsertError } =
                await supabaseAdmin
                    .from("analytics_events")
                    .insert({
                        event_name: "premium_cancelled",
                        visitor_id: cancellationEventId
                    });
            if (cancellationInsertError) throw cancellationInsertError;
        }
    } catch (analyticsError) {
        // Les statistiques ne doivent jamais empêcher la résiliation.
        console.error("Erreur analytics résiliation Premium :", analyticsError.message);
    }

    console.log(







        "🔒 Abonnement résilié, compte repassé Free :",







        subscription.id







    );







}







            return res.json({ received: true });















        } catch (error) {







            console.error("❌ ACTIVATION PREMIUM :", error.message);







            return res.status(500).json({







                error: "Erreur activation Premium"







            });







        }







    }







);







app.use(







    express.json({







        limit: "15mb"







    })







);















app.use(express.static(__dirname));























/* ======================================================







   CONFIGURATION







\====================================================== */















const PORT = process.env.PORT || 3000;















const MAX_PHOTOS = 4;















const MAX_TENTATIVES = 2;















const MODELE = "openrouter/free";















const limites = new Map();























/* ======================================================







   RATE LIMIT







\====================================================== */















function limiterRequetes(req, res, next) {















    const ip = req.ip || "inconnue";















    const maintenant = Date.now();















    const duree = 60 * 60 * 1000;















    const maximum = 30;















    let utilisateur = limites.get(ip);























    if (







        !utilisateur ||







        maintenant > utilisateur.reset







    ) {















        utilisateur = {







            nombre: 0,







            reset: maintenant + duree







        };







    }























    utilisateur.nombre++;















    limites.set(ip, utilisateur);























    if (utilisateur.nombre > maximum) {















        return res







            .status(429)







            .json({







                error:







                    "Trop de requêtes. Réessaie un peu plus tard."







            });







    }























    next();







}























/* ======================================================







   NETTOYAGE







\====================================================== */















function nettoyerTexte(







    valeur,







    longueur = 500







) {















    if (







        valeur === undefined ||







        valeur === null







    ) {















        return "";







    }























    return String(valeur)







        .trim()







        .slice(0, longueur);







}























/* ======================================================







   PETITE PAUSE







\====================================================== */















function attendre(ms) {















    return new Promise(







        resolve =>







            setTimeout(resolve, ms)







    );







}























/* ======================================================







   EXTRACTION JSON







\====================================================== */















function extraireJSON(texte) {















    if (!texte) {















        throw new Error(







            "Réponse IA vide."







        );







    }























    if (







        typeof texte === "object" &&







        !Array.isArray(texte)







    ) {















        return texte;







    }























    let propre =







        String(texte)







            .replace(/**```**json/gi, "")







            .replace(/**```**javascript/gi, "")







            .replace(/**```**js/gi, "")







            .replace(/**```**/g, "")







            .trim();























    if (







        !propre ||







        propre.length < 2







    ) {















        throw new Error(







            "Réponse IA inutilisable."







        );







    }























    const lower =







        propre.toLowerCase();























    if (







        lower === "safe" ||







        lower === "user safety: safe"







    ) {















        throw new Error(







            "Réponse IA inutilisable."







        );







    }























    try {















        return JSON.parse(propre);















    } catch {















        // On continue.







    }























    const debut =







        propre.indexOf("{");















    const fin =







        propre.lastIndexOf("}");























    if (







        debut !== -1 &&







        fin !== -1 &&







        fin > debut







    ) {















        let jsonPossible =







            propre.slice(







                debut,







                fin + 1







            );























        jsonPossible =







            jsonPossible







                .replace(







                    /,\s*}/g,







                    "}"







                )







                .replace(







                    /,\s*]/g,







                    "]"







                );























        try {















            return JSON.parse(







                jsonPossible







            );















        } catch {















            console.error(







                "JSON détecté mais invalide."







            );







        }







    }























    throw new Error(







        "JSON IA invalide."







    );







}























/* ======================================================







   CONTENU REPONSE OPENROUTER







\====================================================== */















function recupererTexteIA(data) {















    const content =







        data?.choices?.[0]







            ?.message?.content;























    if (







        typeof content === "string"







    ) {















        return content.trim();







    }























    if (Array.isArray(content)) {















        return content







            .map(partie => {















                if (







                    typeof partie === "string"







                ) {















                    return partie;







                }























                if (







                    partie &&







                    typeof partie.text === "string"







                ) {















                    return partie.text;







                }























                return "";















            })







            .join("")







            .trim();







    }























    return "";







}























/* ======================================================







   OPENROUTER







\====================================================== */















async function appelerOpenRouter(messages, options = {}) {
    if (!process.env.OPENROUTER_API_KEY) {
        throw new Error("La clé OpenRouter n'est pas configurée.");
    }

    const maxTokens = options.maxTokens || 1800;
    const controller = new AbortController();

    const timeout = setTimeout(
        () => controller.abort(),
        70000
    );

    const debut = Date.now();

    try {
        const OPENROUTER_URL =
            "https://openrouter.ai/api/v1/chat/completions";

        console.log("🔗 URL OPENROUTER =", OPENROUTER_URL);

        const response = await fetch(
            OPENROUTER_URL,
            {
                method: "POST",
                signal: controller.signal,

                headers: {
                    "Authorization":
                        `Bearer ${process.env.OPENROUTER_API_KEY}`,
                    "Content-Type": "application/json",
                    "X-Title": "VintedBoost"
                },

                body: JSON.stringify({
                    model: MODELE,
                    messages,
                    temperature: 0.1,
                    max_tokens: maxTokens
                })
            }
        );

        let data;

        try {
            data = await response.json();
        } catch {
            throw new Error(
                "Réponse OpenRouter illisible."
            );
        }

        if (!response.ok) {
            console.error(
                "OPENROUTER :",
                response.status,
                data?.error?.message || "Erreur inconnue"
            );

            const erreur = new Error(
                data?.error?.message || "Erreur OpenRouter."
            );

            erreur.status = response.status;
            throw erreur;
        }

        const texte = recupererTexteIA(data);

        const temps =
            ((Date.now() - debut) / 1000).toFixed(1);

        console.log(
            `🤖 ${data?.model || MODELE} • ${temps}s • ${data?.choices?.[0]?.finish_reason || "?"}`
        );

        if (!texte) {
            throw new Error(
                "L'IA a renvoyé une réponse vide."
            );
        }

        return texte;

    } catch (error) {
        if (error.name === "AbortError") {
            throw new Error(
                "OpenRouter met trop de temps à répondre."
            );
        }

        throw error;

    } finally {
        clearTimeout(timeout);
    }
}
/* ======================================================







   IA JSON + RETRY







\====================================================== */















async function appelerIAJSON(







    messages,







    options = {}







) {















    let derniereErreur;























    for (







        let tentative = 1;







        tentative <= MAX_TENTATIVES;







        tentative++







    ) {















        try {















            console.log(







                `🤖 IA ${tentative}/${MAX_TENTATIVES}`







            );























            const texte =







                await appelerOpenRouter(







                    messages,







                    options







                );























            const resultat =







                extraireJSON(texte);























            console.log(







                "✅ Réponse IA valide"







            );























            return resultat;























        } catch (error) {















            derniereErreur = error;























       console.error(
    `❌ IA ${tentative}:`,
    error
);























            if (







                error.status === 401 ||







                error.status === 402 ||







                error.status === 403







            ) {















                break;







            }























            if (







                tentative <







                MAX_TENTATIVES







            ) {















                await attendre(350);







            }







        }







    }























    throw new Error(







        derniereErreur?.message ||







        "L'IA n'a pas réussi à répondre."







    );







}























/* ======================================================







   VALIDATION ANALYSE PHOTO







\====================================================== */















function normaliserAnalyse(analyse) {















    return {















        article:







            nettoyerTexte(







                analyse?.article,







                100







            ),















        marque:







            nettoyerTexte(







                analyse?.marque,







                100







            ),















        categorie:







            nettoyerTexte(







                analyse?.categorie,







                100







            ),















        couleur:







            nettoyerTexte(







                analyse?.couleur,







                100







            ),















        tailleVisible:







            nettoyerTexte(







                analyse?.tailleVisible,







                50







            ),















        etat:







            nettoyerTexte(







                analyse?.etat,







                50







            ),















        details:







            nettoyerTexte(







                analyse?.details,







                700







            ),















        defauts:







            nettoyerTexte(







                analyse?.defauts,







                500







            )







    };







}























/* ======================================================







   ANALYSE PHOTOS







\====================================================== */















app.post(







    "/analyze-photos",







    limiterRequetes,







    async (req, res) => {















        const debut =







            Date.now();























        try {















            let images =







                req.body?.images;























            if (







                !Array.isArray(images)







            ) {















                return res







                    .status(400)







                    .json({







                        error:







                            "Format des photos incorrect."







                    });







            }























            images =







                images







                    .slice(







                        0,







                        MAX_PHOTOS







                    )







                    .filter(







                        image =>















                            typeof image ===







                                "string" &&















                            /^data:image\/(jpeg|jpg|png|webp);base64,/i







                                .test(image)







                    );























            if (







                images.length === 0







            ) {















                return res







                    .status(400)







                    .json({







                        error:







                            "Ajoute au moins une photo valide."







                    });







            }























            const prompt = `







Analyse ces photos du même vêtement ou article d'occasion.















Retourne UNIQUEMENT un objet JSON valide avec exactement ces clés :















{







"article":"",







"marque":"",







"categorie":"",







"couleur":"",







"tailleVisible":"",







"etat":"",







"details":"",







"defauts":""







}















Règles :







\- utilise uniquement ce qui est visible ;







\- n'invente jamais marque, taille, matière, modèle ou défaut ;







\- ne confirme jamais l'authenticité ;







\- information inconnue = "";







\- details = caractéristiques visibles, texte court ;







\- defauts = uniquement les défauts clairement visibles.















categorie = uniquement :







Veste, Sweat, T-shirt, Pantalon, Jean, Chaussures, Accessoire, Robe, Chemise, Pull, Short, Autre.















etat = uniquement :







Neuf avec étiquette, Neuf sans étiquette, Très bon état, Bon état, État satisfaisant, ou "".















Aucun Markdown. Aucune explication.







`.trim();























            const contenu = [















                {







                    type: "text",







                    text: prompt







                }







            ];























            for (







                const image of images







            ) {















                contenu.push({















                    type:







                        "image_url",















                    image_url: {







                        url: image







                    }







                });







            }























            const analyse =







                await appelerIAJSON(







                    [







                        {







                            role:







                                "user",















                            content:







                                contenu







                        }







                    ],







                    {







                        maxTokens:







                            1800







                    }







                );























            const resultat =







                normaliserAnalyse(







                    analyse







                );























            if (







                !resultat.article &&







                !resultat.categorie &&







                !resultat.details







            ) {















                throw new Error(







                    "L'IA n'a pas réussi à identifier l'article."







                );







            }























            console.log(







                `📸 Analyse terminée en ${((Date.now() - debut) / 1000).toFixed(1)}s`







            );























            return res.json(







                resultat







            );























        } catch (error) {















            console.error(







                "❌ ANALYSE :",







                error.message







            );























            return res







                .status(500)







                .json({







                    error:







                        "L'analyse IA a échoué. Réessaie dans quelques secondes."







                });







        }







    }







);























/* ======================================================







   STYLE







\====================================================== */















function obtenirStyle(style) {















    switch (style) {















        case "court":















            return (







                "Annonce courte, directe, naturelle et efficace."







            );























        case "vendeur":















            return (







                "Annonce attractive et dynamique, sans exagération ni fausse urgence."







            );























        case "premium":















            return (







                "Annonce élégante, propre et soignée, sans inventer d'informations."







            );























        default:















            return (







                "Ton naturel, simple et crédible, comme un particulier."







            );







    }







}























/* ======================================================







   PLATEFORME







\====================================================== */















function obtenirPlateforme(







    plateforme







) {















    if (







        plateforme === "ebay"







    ) {















        return (







            "eBay : titre précis et description claire et structurée."







        );







    }























    return (







        "Vinted : titre recherché mais naturel, description simple entre particuliers."







    );







}























/* ======================================================







   SUPABASE UTILISATEUR







\====================================================== */















function creerClientSupabaseUtilisateur(







    accessToken







) {















    const url =







        process.env.SUPABASE_URL;















    const publishableKey =







        process.env.SUPABASE_PUBLISHABLE_KEY;























    if (







        !url ||







        !publishableKey







    ) {















        throw new Error(







            "Supabase n'est pas configuré."







        );







    }























    return createClient(







        url,







        publishableKey,







        {







            global: {















                headers: {















                    Authorization:







                        `Bearer ${accessToken}`







                }







            },















            auth: {















                persistSession:







                    false,















                autoRefreshToken:







                    false







            }







        }







    );







}























/* ======================================================







   VERIFICATION COMPTE + QUOTA







\====================================================== */















async function verifierUtilisateurEtQuota(







    req







) {















    const authorization =







        req.headers.authorization || "";























    if (







        !authorization.startsWith(







            "Bearer "







        )







    ) {















        const erreur =







            new Error(







                "Connecte-toi pour générer une annonce."







            );















        erreur.status = 401;















        throw erreur;







    }























    const accessToken =







        authorization







            .slice(7)







            .trim();























    if (!accessToken) {















        const erreur =







            new Error(







                "Session invalide."







            );















        erreur.status = 401;















        throw erreur;







    }























    const supabase =







        creerClientSupabaseUtilisateur(







            accessToken







        );























    const {







        data: userData,







        error: userError







    } =







        await supabase.auth.getUser(







            accessToken







        );























    if (







        userError ||







        !userData?.user







    ) {















        const erreur =







            new Error(







                "Session expirée. Reconnecte-toi."







            );















        erreur.status = 401;















        throw erreur;







    }























    const {







        data: quota,







        error: quotaError







    } =







        await supabase.rpc(







            "use_generation"







        );























    if (quotaError) {















        console.error(







            "❌ QUOTA :",







            quotaError.message







        );























        const erreur =







            new Error(







                "Impossible de vérifier ton quota."







            );















        erreur.status = 500;















        throw erreur;







    }























    if (!quota?.allowed) {















        const erreur =







            new Error(







                "Tu as utilisé tes 5 générations gratuites ce mois-ci. Passe à Premium pour continuer."







            );























        erreur.status = 403;















        erreur.code =







            "QUOTA_REACHED";















        erreur.quota =







            quota;























        throw erreur;







    }























    return {















        user:







            userData.user,















         quota,















    supabase







};







}























/* ======================================================







   GENERATION ANNONCE







\====================================================== */















app.post(







    "/generate",







    limiterRequetes,







    async (req, res) => {















        const debut =







            Date.now();























        try {















            /*







            V9 :







            vérifie le compte Supabase







            et consomme 1 génération.







            */















            const sessionQuota =







                await verifierUtilisateurEtQuota(







                    req







                );























            const article =







                nettoyerTexte(







                    req.body?.article,







                    100







                );















            const marque =







                nettoyerTexte(







                    req.body?.marque,







                    100







                );















            const categorie =







                nettoyerTexte(







                    req.body?.categorie,







                    100







                );















            const taille =







                nettoyerTexte(







                    req.body?.taille,







                    50







                );















            const couleur =







                nettoyerTexte(







                    req.body?.couleur,







                    100







                );















            const etat =







                nettoyerTexte(







                    req.body?.etat,







                    50







                );















            const prix =







                nettoyerTexte(







                    req.body?.prix,







                    20







                );















            const details =







                nettoyerTexte(







                    req.body?.details,







                    1000







                );















            const defauts =







                nettoyerTexte(







                    req.body?.defauts,







                    500







                );















            const style =







                nettoyerTexte(







                    req.body?.style,







                    30







                );















            const plateforme =







                nettoyerTexte(







                    req.body?.plateforme,







                    30







                );























            if (!article) {















                return res







                    .status(400)







                    .json({







                        error:







                            "Indique au minimum le type d'article."







                    });







            }























            const consigneStyle =







                obtenirStyle(style);























            const consignePlateforme =







                obtenirPlateforme(







                    plateforme







                );























            const prompt = `







Crée une annonce de seconde main.















Plateforme :







${consignePlateforme}















Style :







${consigneStyle}















Article : ${article}







Marque : ${marque || "inconnue"}







Catégorie : ${categorie || "inconnue"}







Taille : ${taille || "inconnue"}







Couleur : ${couleur || "inconnue"}







État : ${etat || "inconnu"}







Prix envisagé : ${prix ? prix + " €" : "non renseigné"}







Détails : ${details || "aucun"}







Défauts : ${defauts || "aucun renseigné"}















Retourne UNIQUEMENT :















{







"titre":"",







"description":"",







"prixConseille":"",







"prixMin":"",







"prixMax":"",







"motsCles":[]







}















Règles :







\- aucune information inventée ;







\- ne jamais inventer matière ou prix neuf ;







\- ne jamais garantir l'authenticité ;







\- défauts mentionnés honnêtement ;







\- titre clair avec les informations utiles ;







\- description naturelle et facile à lire ;







\- maximum 8 mots-clés pertinents ;







\- pas de fausse urgence ;







\- prix = estimation indicative uniquement ;







\- prixConseille, prixMin et prixMax = nombres entiers sous forme de texte ;







\- prixMin <= prixConseille <= prixMax ;







\- aucun Markdown ;







\- aucun texte hors JSON.







`.trim();























            const annonce =







                await appelerIAJSON(







                    [







                        {







                            role:







                                "user",















                            content:







                                prompt







                        }







                    ],







                    {







                        maxTokens:







                            1600







                    }







                );























            let motsCles =







                Array.isArray(







                    annonce?.motsCles







                )







                    ? annonce.motsCles







                    : [];























            motsCles =







                motsCles







                    .slice(0, 8)







                    .map(







                        mot =>







                            nettoyerTexte(







                                mot,







                                50







                            )







                    )







                    .filter(Boolean);























            const resultat = {















                titre:







                    nettoyerTexte(







                        annonce?.titre,







                        160







                    ),















                description:







                    nettoyerTexte(







                        annonce?.description,







                        2000







                    ),















                prixConseille:







                    nettoyerTexte(







                        annonce?.prixConseille,







                        20







                    ),















                prixMin:







                    nettoyerTexte(







                        annonce?.prixMin,







                        20







                    ),















                prixMax:







                    nettoyerTexte(







                        annonce?.prixMax,







                        20







                    ),















                motsCles







            };























            if (







                !resultat.titre ||







                !resultat.description







            ) {















                throw new Error(







                    "Annonce IA incomplète."







                );







            }























            console.log(







                `✨ Annonce générée en ${((Date.now() - debut) / 1000).toFixed(1)}s`







            );







try {















    const { error: analyticsError } =







        await sessionQuota.supabase.rpc(







            "track_event",







            {







                event_name_input: "generation"







            }







        );















    if (analyticsError) {







        console.error(







            "Erreur analytics generation :",







            analyticsError.message







        );







    }















} catch (analyticsError) {















    console.error(







        "Erreur analytics generation :",







        analyticsError.message







    );







}















            return res.json({















                ...resultat,















                quota:







                    sessionQuota.quota







            });























        } catch (error) {















            console.error(







                "❌ GENERATION :",







                error.message







            );























            return res







                .status(







                    error.status || 500







                )







                .json({















                    error:







                        error.status







                            ? error.message







                            : "La génération a échoué. Réessaie dans quelques secondes.",















                    code:







                        error.code ||







                        undefined,















                    quota:







                        error.quota ||







                        undefined







                });







        }







    }







);















/* ======================================================







   STRIPE CHECKOUT PREMIUM







\====================================================== */















app.post("/create-checkout-session", async (req, res) => {







    try {







        const authorization = req.headers.authorization || "";















        if (!authorization.startsWith("Bearer ")) {







            return res.status(401).json({







                error: "Connecte-toi pour passer Premium."







            });







        }















        const accessToken = authorization.slice(7).trim();















        const supabase =







            creerClientSupabaseUtilisateur(accessToken);















        const { data: userData, error: userError } =







            await supabase.auth.getUser(accessToken);















        if (userError || !userData?.user) {







            return res.status(401).json({







                error: "Session invalide."







            });







        }















        const session = await stripe.checkout.sessions.create({







            mode: "subscription",















            line_items: [







                {







                    price: process.env.STRIPE_PRICE_ID,







                    quantity: 1







                }







            ],















            customer_email: userData.user.email,















            client_reference_id: userData.user.id,















            metadata: {







                supabase_user_id: userData.user.id







            },















            success_url:







                `${req.protocol}://${req.get("host")}/?premium=success`,















            cancel_url:







                `${req.protocol}://${req.get("host")}/?premium=cancel`







        });















        res.json({







            url: session.url







        });















    } catch (error) {







        console.error("❌ STRIPE :", error.message);















        res.status(500).json({







            error: "Impossible de démarrer le paiement."







        });







    }







});







app.post("/create-customer-portal", async (req, res) => {







    try {







        const authorization = req.headers.authorization || "";















        if (!authorization.startsWith("Bearer ")) {







            return res.status(401).json({







                error: "Connecte-toi pour gérer ton abonnement."







            });







        }















        const accessToken = authorization.slice(7).trim();















        const supabase =







            creerClientSupabaseUtilisateur(accessToken);















        const { data: userData, error: userError } =







            await supabase.auth.getUser(accessToken);















        if (userError || !userData?.user) {







            return res.status(401).json({







                error: "Session invalide."







            });







        }















        const { data: profil, error: profilError } =







            await supabaseAdmin







                .from("profiles")







                .select("stripe_customer_id")







                .eq("id", userData.user.id)







                .single();















        if (profilError || !profil?.stripe_customer_id) {







            return res.status(400).json({







                error: "Aucun abonnement Stripe trouvé."







            });







        }















        const portalSession =







            await stripe.billingPortal.sessions.create({







                customer: profil.stripe_customer_id,







                return_url:







                    `${req.protocol}://${req.get("host")}/`







            });















        return res.json({







            url: portalSession.url







        });















    } catch (error) {







        console.error("❌ PORTAIL STRIPE :", error.message);















        return res.status(500).json({







            error: "Impossible d'ouvrir la gestion de l'abonnement."







        });







    }







});







/* ======================================================







   CONFIGURATION PUBLIQUE SUPABASE







\====================================================== */



















/* ======================================================



   ANALYTICS — VISITES



\====================================================== */







app.post("/track-visit", async (req, res) => {



    try {



        const visitorId = String(req.body?.visitorId || "").trim().slice(0, 100);







        if (!visitorId) {



            return res.status(400).json({ error: "Identifiant visiteur manquant." });



        }







        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();







        const { data: existing, error: readError } =



            await supabaseAdmin



                .from("analytics_events")



                .select("id")



                .eq("event_name", "site_visit")



                .eq("visitor_id", visitorId)



                .gte("created_at", since)



                .limit(1);







        if (readError) throw readError;







        if (existing && existing.length > 0) {



            return res.json({ ok: true, counted: false });



        }







        const { error: insertError } =



            await supabaseAdmin



                .from("analytics_events")



                .insert({



                    event_name: "site_visit",



                    visitor_id: visitorId



                });







        if (insertError) throw insertError;







        return res.json({ ok: true, counted: true });







    } catch (error) {



        console.error("❌ ANALYTICS VISITE :", error.message);



        return res.status(500).json({



            error: "Impossible d'enregistrer la visite."



        });



    }



});











app.get("/analytics.html", (req, res) => {







    res.sendFile(







        __dirname + "/analytics.html"







    );







});















app.get(







    "/supabase-config",







    (req, res) => {















        const url =







            process.env.SUPABASE_URL;















        const publishableKey =







            process.env







                .SUPABASE_PUBLISHABLE_KEY;























        if (







            !url ||







            !publishableKey







        ) {















            return res







                .status(500)







                .json({







                    error:







                        "Supabase n'est pas configuré."







                });







        }























        res.json({















            url,















            publishableKey







        });







    }







);























/* ======================================================







   HEALTH







\====================================================== */















app.get(







    "/health",







    (req, res) => {















        res.json({















            status:







                "ok",















            app:







                "VintedBoost",















            version:







                "9"







        });







    }







);























/* ======================================================







   404 API







\====================================================== */















app.use(







    "/api",







    (req, res) => {















        res







            .status(404)







            .json({







                error:







                    "Route inconnue."







            });







    }







);























/* ======================================================







   DEMARRAGE







\====================================================== */















app.listen(







    PORT,







    () => {















        console.log(







            `🚀 VintedBoost V9 fonctionne sur le port ${PORT}`







        );















        console.log(







            `🤖 Modèle : ${MODELE}`







        );







    }







);