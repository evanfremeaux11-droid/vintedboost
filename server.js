const express = require("express");
require("dotenv").config();

const app = express();

/* ======================================================
   VINTEDBOOST V7
====================================================== */

app.set("trust proxy", 1);

app.use(
    express.json({
        limit: "15mb"
    })
);

app.use(express.static(__dirname));


/* ======================================================
   CONFIGURATION
====================================================== */

const PORT =
    process.env.PORT || 3000;

const MAX_PHOTOS = 4;

/*
2 tentatives au lieu de 3.

Si l'IA répond correctement :
1 seul appel.

Si le routeur gratuit renvoie une
réponse vide/invalide :
1 nouvelle tentative.
*/
const MAX_TENTATIVES = 2;

const MODELE =
    "openrouter/free";

const limites =
    new Map();


/* ======================================================
   RATE LIMIT
====================================================== */

function limiterRequetes(
    req,
    res,
    next
) {

    const ip =
        req.ip || "inconnue";

    const maintenant =
        Date.now();

    const duree =
        60 * 60 * 1000;

    const maximum =
        30;


    let utilisateur =
        limites.get(ip);


    if (
        !utilisateur ||
        maintenant > utilisateur.reset
    ) {

        utilisateur = {

            nombre: 0,

            reset:
                maintenant + duree
        };
    }


    utilisateur.nombre++;

    limites.set(
        ip,
        utilisateur
    );


    if (
        utilisateur.nombre >
        maximum
    ) {

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
====================================================== */

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
====================================================== */

function attendre(ms) {

    return new Promise(
        resolve =>
            setTimeout(
                resolve,
                ms
            )
    );
}


/* ======================================================
   EXTRACTION JSON
====================================================== */

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
            .replace(/```json/gi, "")
            .replace(/```javascript/gi, "")
            .replace(/```js/gi, "")
            .replace(/```/g, "")
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


    /*
    1 - JSON direct
    */

    try {

        return JSON.parse(
            propre
        );

    } catch {

        // On continue.
    }


    /*
    2 - Recherche du premier {
        et du dernier }
    */

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
   CONTENU DE LA REPONSE OPENROUTER
====================================================== */

function recupererTexteIA(data) {

    const content =
        data?.choices?.[0]
            ?.message?.content;


    if (
        typeof content === "string"
    ) {

        return content.trim();
    }


    /*
    Certains modèles renvoient
    plusieurs parties.
    */

    if (
        Array.isArray(content)
    ) {

        return content
            .map(partie => {

                if (
                    typeof partie ===
                    "string"
                ) {

                    return partie;
                }


                if (
                    partie &&
                    typeof partie.text ===
                    "string"
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
   APPEL OPENROUTER
====================================================== */

async function appelerOpenRouter(
    messages,
    options = {}
) {

    if (
        !process.env
            .OPENROUTER_API_KEY
    ) {

        throw new Error(
            "La clé OpenRouter n'est pas configurée."
        );
    }


    const maxTokens =
        options.maxTokens || 1800;


    /*
    Timeout serveur.

    On évite qu'un appel IA reste
    bloqué indéfiniment.
    */

    const controller =
        new AbortController();

    const timeout =
        setTimeout(
            () =>
                controller.abort(),
            70000
        );


    const debut =
        Date.now();


    try {

        const response =
            await fetch(
                "https://openrouter.ai/api/v1/chat/completions",
                {

                    method: "POST",

                    signal:
                        controller.signal,

                    headers: {

                        "Authorization":
                            `Bearer ${process.env.OPENROUTER_API_KEY}`,

                        "Content-Type":
                            "application/json",

                        "X-Title":
                            "VintedBoost"
                    },


                    body:
                        JSON.stringify({

                            model:
                                MODELE,

                            messages,

                            temperature:
                                0.1,

                            max_tokens:
                                maxTokens
                        })
                }
            );


        let data;


        try {

            data =
                await response.json();

        } catch {

            throw new Error(
                "Réponse OpenRouter illisible."
            );
        }


        if (!response.ok) {

            console.error(
                "OPENROUTER :",
                response.status,
                data?.error?.message ||
                "Erreur inconnue"
            );


            const erreur =
                new Error(
                    data?.error?.message ||
                    "Erreur OpenRouter."
                );


            erreur.status =
                response.status;


            throw erreur;
        }


        const texte =
            recupererTexteIA(
                data
            );


        const temps =
            (
                (
                    Date.now() -
                    debut
                ) / 1000
            ).toFixed(1);


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

        if (
            error.name ===
            "AbortError"
        ) {

            throw new Error(
                "OpenRouter met trop de temps à répondre."
            );
        }


        throw error;


    } finally {

        clearTimeout(
            timeout
        );
    }
}


/* ======================================================
   IA JSON + RETRY
====================================================== */

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
                extraireJSON(
                    texte
                );


            console.log(
                "✅ Réponse IA valide"
            );


            return resultat;


        } catch (error) {

            derniereErreur =
                error;


            console.error(
                `❌ IA ${tentative}:`,
                error.message
            );


            /*
            Erreurs où refaire la même
            requête n'est pas utile.
            */

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

                /*
                Seulement 350 ms.

                Ancienne version :
                800 ms.
                */

                await attendre(
                    350
                );
            }
        }
    }


    throw new Error(
        derniereErreur?.message ||
        "L'IA n'a pas réussi à répondre."
    );
}


/* ======================================================
   VALIDATION ANALYSE
====================================================== */

function normaliserAnalyse(
    analyse
) {

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
====================================================== */

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
                !Array.isArray(
                    images
                )
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


            /*
            Prompt V7 plus court.

            Moins de texte à traiter.
            */

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
- utilise uniquement ce qui est visible ;
- n'invente jamais marque, taille, matière, modèle ou défaut ;
- ne confirme jamais l'authenticité ;
- information inconnue = "";
- details = caractéristiques visibles, texte court ;
- defauts = uniquement les défauts clairement visibles.

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


            /*
            Analyse photo :
            on laisse assez de tokens
            pour les modèles gratuits
            qui peuvent utiliser des
            tokens de raisonnement.
            */

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


            /*
            Au minimum, on veut
            quelque chose d'exploitable.
            */

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
====================================================== */

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
====================================================== */

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
   GENERATION ANNONCE
====================================================== */

app.post(
    "/generate",
    limiterRequetes,
    async (req, res) => {

        const debut =
            Date.now();


        try {

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
                obtenirStyle(
                    style
                );


            const consignePlateforme =
                obtenirPlateforme(
                    plateforme
                );


            /*
            Prompt génération V7.

            Plus court et plus structuré.
            */

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
- aucune information inventée ;
- ne jamais inventer matière ou prix neuf ;
- ne jamais garantir l'authenticité ;
- défauts mentionnés honnêtement ;
- titre clair avec les informations utiles ;
- description naturelle et facile à lire ;
- maximum 8 mots-clés pertinents ;
- pas de fausse urgence ;
- prix = estimation indicative uniquement ;
- prixConseille, prixMin et prixMax = nombres entiers sous forme de texte ;
- prixMin <= prixConseille <= prixMax ;
- aucun Markdown ;
- aucun texte hors JSON.
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


            return res.json(
                resultat
            );


        } catch (error) {

            console.error(
                "❌ GENERATION :",
                error.message
            );


            return res
                .status(500)
                .json({

                    error:
                        "La génération a échoué. Réessaie dans quelques secondes."
                });
        }
    }
);


/* ======================================================
   HEALTH
====================================================== */

app.get(
    "/health",
    (req, res) => {

        res.json({

            status:
                "ok",

            app:
                "VintedBoost",

            version:
                "7"
        });
    }
);


/* ======================================================
   404 API
====================================================== */

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
====================================================== */

app.listen(
    PORT,
    () => {

        console.log(
            `🚀 VintedBoost V7 fonctionne sur le port ${PORT}`
        );

        console.log(
            `🤖 Modèle : ${MODELE}`
        );
    }
);