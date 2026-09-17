const express = require("express");
require("dotenv").config();

const app = express();

app.set("trust proxy", 1);

app.use(express.json({ limit: "25mb" }));
app.use(express.static(__dirname));


// ======================================================
// CONFIGURATION
// ======================================================

const PORT = process.env.PORT || 3000;

const MAX_PHOTOS = 4;

// Limitation simple contre les abus
const limites = new Map();


// ======================================================
// RATE LIMIT SIMPLE
// ======================================================

function limiterRequetes(req, res, next) {

    const ip = req.ip || "inconnue";

    const maintenant = Date.now();

    const duree = 60 * 60 * 1000;

    const maximum = 20;

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

        return res.status(429).json({
            error:
                "Trop de générations. Réessaie un peu plus tard."
        });

    }

    next();
}


// ======================================================
// NETTOYAGE TEXTE
// ======================================================

function nettoyerTexte(valeur, longueur = 500) {

    if (typeof valeur !== "string") {
        return "";
    }

    return valeur
        .trim()
        .slice(0, longueur);
}


// ======================================================
// EXTRAIRE JSON IA
// ======================================================

function extraireJSON(texte) {

    let nettoyage = texte
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

    const debut =
        nettoyage.indexOf("{");

    const fin =
        nettoyage.lastIndexOf("}");

    if (
        debut !== -1 &&
        fin !== -1
    ) {

        nettoyage =
            nettoyage.slice(
                debut,
                fin + 1
            );

    }

    return JSON.parse(nettoyage);
}


// ======================================================
// APPEL OPENROUTER
// ======================================================

async function appelerIA(messages) {

    if (!process.env.OPENROUTER_API_KEY) {

        throw new Error(
            "La clé OpenRouter n'est pas configurée."
        );

    }

    const response = await fetch(
        "https://openrouter.ai/api/v1/chat/completions",
        {
            method: "POST",

            headers: {
                "Authorization":
                    `Bearer ${process.env.OPENROUTER_API_KEY}`,

                "Content-Type":
                    "application/json"
            },

            body: JSON.stringify({
                model: "openrouter/free",
                messages,
                temperature: 0.4
            })
        }
    );

    const data =
        await response.json();


    if (!response.ok) {

        console.error(
            "ERREUR OPENROUTER :",
            data
        );

        throw new Error(
            data?.error?.message ||
            "Le service IA est temporairement indisponible."
        );

    }


    const texte =
        data.choices?.[0]?.message?.content;


    if (!texte) {

        throw new Error(
            "L'IA n'a renvoyé aucune réponse."
        );

    }


    return texte;
}


// ======================================================
// ANALYSE DE PLUSIEURS PHOTOS
// ======================================================

app.post(
    "/analyze-photos",
    limiterRequetes,
    async (req, res) => {

        try {

            let { images } = req.body;


            if (!Array.isArray(images)) {

                return res.status(400).json({
                    error:
                        "Format des photos incorrect."
                });

            }


            images =
                images.slice(
                    0,
                    MAX_PHOTOS
                );


            if (images.length === 0) {

                return res.status(400).json({
                    error:
                        "Ajoute au moins une photo."
                });

            }


            const imagesValides =
                images.filter(
                    image =>
                        typeof image === "string" &&
                        /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(
                            image
                        )
                );


            if (imagesValides.length === 0) {

                return res.status(400).json({
                    error:
                        "Les photos envoyées ne sont pas valides."
                });

            }


            const prompt = `
Tu analyses plusieurs photos DU MÊME article destiné à être vendu d'occasion.

Les différentes photos peuvent montrer :
- l'article entier
- le logo ou la marque
- une étiquette
- des détails
- des défauts

Analyse toutes les photos ensemble.

IMPORTANT :

Tu dois uniquement décrire ce qui est réellement visible.

N'invente JAMAIS :
- une marque non lisible
- un modèle précis incertain
- une taille non visible
- une matière non identifiable avec certitude
- une preuve d'authenticité
- un défaut invisible

Tu ne dois jamais affirmer qu'un article est authentique.

Pour l'état, sois prudent.
Une photo ne permet pas toujours de connaître parfaitement l'état réel.

Retourne UNIQUEMENT un JSON valide :

{
    "article": "",
    "marque": "",
    "categorie": "",
    "couleur": "",
    "tailleVisible": "",
    "etat": "",
    "details": "",
    "defauts": ""
}

categorie doit être une catégorie simple comme :
"Veste",
"Sweat",
"T-shirt",
"Pantalon",
"Jean",
"Chaussures",
"Accessoire",
"Robe",
"Chemise",
"Pull",
"Short",
"Autre"

etat doit être exactement une valeur parmi :

"Neuf avec étiquette"
"Neuf sans étiquette"
"Très bon état"
"Bon état"
"État satisfaisant"

Si tu ne peux pas déterminer une information,
retourne une chaîne vide "".

Dans "details", décris brièvement les éléments utiles réellement visibles.

Dans "defauts", indique uniquement les défauts clairement visibles.
Sinon retourne "".
`;


            const contenu = [
                {
                    type: "text",
                    text: prompt
                }
            ];


            for (
                const image of imagesValides
            ) {

                contenu.push({
                    type: "image_url",

                    image_url: {
                        url: image
                    }
                });

            }


            const texte =
                await appelerIA([
                    {
                        role: "user",
                        content: contenu
                    }
                ]);


            let analyse;


            try {

                analyse =
                    extraireJSON(texte);

            } catch (error) {

                console.error(
                    "JSON PHOTO INVALIDE :",
                    texte
                );

                return res.status(500).json({
                    error:
                        "L'analyse n'a pas pu être comprise. Réessaie."
                });

            }


            res.json({
                article:
                    nettoyerTexte(
                        analyse.article,
                        100
                    ),

                marque:
                    nettoyerTexte(
                        analyse.marque,
                        100
                    ),

                categorie:
                    nettoyerTexte(
                        analyse.categorie,
                        100
                    ),

                couleur:
                    nettoyerTexte(
                        analyse.couleur,
                        100
                    ),

                tailleVisible:
                    nettoyerTexte(
                        analyse.tailleVisible,
                        50
                    ),

                etat:
                    nettoyerTexte(
                        analyse.etat,
                        50
                    ),

                details:
                    nettoyerTexte(
                        analyse.details,
                        700
                    ),

                defauts:
                    nettoyerTexte(
                        analyse.defauts,
                        500
                    )
            });


        } catch (error) {

            console.error(
                "ERREUR ANALYSE :",
                error
            );

            res.status(500).json({
                error:
                    error.message
            });

        }

    }
);


// ======================================================
// GENERATION ANNONCE
// ======================================================

app.post(
    "/generate",
    limiterRequetes,
    async (req, res) => {

        try {

            const article =
                nettoyerTexte(
                    req.body.article,
                    100
                );

            const marque =
                nettoyerTexte(
                    req.body.marque,
                    100
                );

            const categorie =
                nettoyerTexte(
                    req.body.categorie,
                    100
                );

            const taille =
                nettoyerTexte(
                    req.body.taille,
                    50
                );

            const couleur =
                nettoyerTexte(
                    req.body.couleur,
                    100
                );

            const etat =
                nettoyerTexte(
                    req.body.etat,
                    50
                );

            const prix =
                nettoyerTexte(
                    String(
                        req.body.prix || ""
                    ),
                    20
                );

            const details =
                nettoyerTexte(
                    req.body.details,
                    1000
                );

            const defauts =
                nettoyerTexte(
                    req.body.defauts,
                    500
                );

            const style =
                nettoyerTexte(
                    req.body.style,
                    30
                );

            const plateforme =
                nettoyerTexte(
                    req.body.plateforme,
                    30
                );


            if (!article) {

                return res.status(400).json({
                    error:
                        "Indique au minimum le type d'article."
                });

            }


            let consigneStyle =
                "Utilise un ton naturel, simple et crédible.";


            if (style === "court") {

                consigneStyle =
                    "Fais une annonce courte et très directe.";

            }


            if (style === "vendeur") {

                consigneStyle =
                    "Fais une annonce attractive et dynamique, sans exagération.";

            }


            if (style === "premium") {

                consigneStyle =
                    "Utilise un ton élégant, soigné et premium, sans inventer d'informations.";

            }


            let consignePlateforme =
                "Adapte l'annonce à une plateforme de seconde main.";


            if (plateforme === "vinted") {

                consignePlateforme = `
L'annonce est destinée à Vinted.
Utilise un style naturel adapté à une annonce entre particuliers.
Le titre doit être clair et relativement court.
`;

            }


            if (plateforme === "ebay") {

                consignePlateforme = `
L'annonce est destinée à eBay.
Le titre doit être précis et descriptif.
La description peut être légèrement plus structurée.
`;

            }


            const prompt = `
Tu rédiges une annonce de vente d'occasion.

PLATEFORME :
${plateforme || "non précisée"}

${consignePlateforme}

STYLE :
${consigneStyle}

INFORMATIONS FOURNIES PAR L'UTILISATEUR :

Article :
${article}

Marque :
${marque || "non renseignée"}

Catégorie :
${categorie || "non renseignée"}

Taille :
${taille || "non renseignée"}

Couleur :
${couleur || "non renseignée"}

État :
${etat || "non renseigné"}

Prix souhaité :
${prix ? prix + " €" : "non renseigné"}

Détails :
${details || "aucun"}

Défauts :
${defauts || "aucun défaut renseigné"}

RÈGLES IMPORTANTES :

- N'invente aucune information.
- N'invente jamais une marque.
- N'invente jamais une matière.
- N'invente jamais le prix neuf.
- N'invente jamais une taille.
- N'affirme jamais que l'article est authentique.
- Mentionne les défauts renseignés de manière honnête.
- N'utilise pas de fausse urgence.
- N'affirme pas que l'article va forcément se vendre.
- Évite les phrases robotiques.
- Maximum 8 mots-clés.
- Les mots-clés doivent être pertinents.

PRIX :

Si un prix souhaité est fourni :
base ta suggestion principalement sur ce prix et les informations fournies.

Si aucun prix n'est fourni :
fais uniquement une estimation indicative prudente basée sur les informations disponibles.

Tu n'as PAS accès aux ventes réelles actuelles de Vinted ou eBay.
Ne prétends donc jamais utiliser des ventes récentes ou des données de marché en temps réel.

Retourne UNIQUEMENT ce JSON valide :

{
    "titre": "",
    "description": "",
    "prixConseille": "",
    "prixMin": "",
    "prixMax": "",
    "motsCles": []
}

Pour prixConseille, prixMin et prixMax :
retourne uniquement un nombre entier sous forme de texte.
Exemple :
"39"

motsCles doit être un tableau de chaînes de caractères.
`;


            const texte =
                await appelerIA([
                    {
                        role: "user",
                        content: prompt
                    }
                ]);


            let annonce;


            try {

                annonce =
                    extraireJSON(texte);

            } catch (error) {

                console.error(
                    "JSON ANNONCE INVALIDE :",
                    texte
                );

                return res.status(500).json({
                    error:
                        "L'IA a renvoyé une réponse incorrecte. Clique sur Regénérer."
                });

            }


            let motsCles =
                annonce.motsCles;


            if (
                !Array.isArray(
                    motsCles
                )
            ) {

                motsCles = [];

            }


            motsCles =
                motsCles
                    .slice(0, 8)
                    .map(
                        mot =>
                            nettoyerTexte(
                                String(mot),
                                50
                            )
                    )
                    .filter(Boolean);


            res.json({

                titre:
                    nettoyerTexte(
                        annonce.titre,
                        160
                    ),

                description:
                    nettoyerTexte(
                        annonce.description,
                        2000
                    ),

                prixConseille:
                    nettoyerTexte(
                        String(
                            annonce.prixConseille ||
                            ""
                        ),
                        20
                    ),

                prixMin:
                    nettoyerTexte(
                        String(
                            annonce.prixMin ||
                            ""
                        ),
                        20
                    ),

                prixMax:
                    nettoyerTexte(
                        String(
                            annonce.prixMax ||
                            ""
                        ),
                        20
                    ),

                motsCles

            });


        } catch (error) {

            console.error(
                "ERREUR GENERATION :",
                error
            );

            res.status(500).json({
                error:
                    error.message
            });

        }

    }
);


// ======================================================
// TEST SERVEUR
// ======================================================

app.get("/health", (req, res) => {

    res.json({
        status: "ok",
        app: "VintedBoost"
    });

});


// ======================================================
// DEMARRAGE
// ======================================================

app.listen(PORT, () => {

    console.log(
        `🚀 VintedBoost fonctionne sur le port ${PORT}`
    );

});