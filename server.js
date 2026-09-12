const express = require("express");
require("dotenv").config();

const app = express();

// Permet d'envoyer les photos en Base64
app.use(express.json({ limit: "12mb" }));
app.use(express.static(__dirname));


// =============================
// ANALYSE DE LA PHOTO
// =============================

app.post("/analyze-photo", async (req, res) => {
    try {
        const { image } = req.body;

        if (!image) {
            return res.status(400).json({
                error: "Aucune photo reçue."
            });
        }

        const prompt = `
Analyse cette photo d'un article destiné à être vendu sur une plateforme de seconde main.

Retourne UNIQUEMENT un JSON valide.

Tu dois essayer d'identifier :
- le type d'article
- la marque seulement si elle est clairement visible
- la couleur principale
- l'état apparent

N'invente jamais une marque si tu ne peux pas la lire clairement.
N'invente pas la taille.
N'affirme jamais qu'un article est authentique.

Format exact :

{
  "article": "",
  "couleur": "",
  "etat": "",
  "details": ""
}

Pour "etat", utilise uniquement une de ces valeurs :
"Neuf avec étiquette"
"Neuf sans étiquette"
"Très bon état"
"Bon état"
"État satisfaisant"

Dans details, donne une courte description uniquement de ce qui est réellement visible.
`;

        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",

                headers: {
                    "Authorization":
                        `Bearer ${process.env.OPENROUTER_API_KEY}`,

                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    model: "openrouter/free",

                    messages: [
                        {
                            role: "user",

                            content: [
                                {
                                    type: "text",
                                    text: prompt
                                },

                                {
                                    type: "image_url",

                                    image_url: {
                                        url: image
                                    }
                                }
                            ]
                        }
                    ]
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error(
                "ERREUR ANALYSE PHOTO :",
                data
            );

            return res.status(response.status).json({
                error:
                    data?.error?.message ||
                    "Impossible d'analyser la photo."
            });
        }

        let texte =
            data.choices?.[0]?.message?.content;

        if (!texte) {
            throw new Error(
                "L'IA n'a renvoyé aucune analyse."
            );
        }

        // Retire les balises ```json éventuelles
        texte = texte
            .replace(/```json/gi, "")
            .replace(/```/g, "")
            .trim();

        let analyse;

        try {
            analyse = JSON.parse(texte);
        } catch (e) {
            console.error(
                "JSON PHOTO INVALIDE :",
                texte
            );

            return res.status(500).json({
                error:
                    "L'analyse de la photo n'a pas pu être comprise. Réessaie avec une autre photo."
            });
        }

        res.json(analyse);

    } catch (error) {
        console.error(
            "ERREUR PHOTO :",
            error
        );

        res.status(500).json({
            error: error.message
        });
    }
});


// =============================
// GENERATION DE L'ANNONCE
// =============================

app.post("/generate", async (req, res) => {
    try {
        const {
            article,
            taille,
            couleur,
            etat,
            prix,
            details
        } = req.body;

        if (!article) {
            return res.status(400).json({
                error:
                    "Indique au minimum le nom de l'article."
            });
        }

        const prompt = `
Tu es un spécialiste de la rédaction d'annonces de vêtements et accessoires d'occasion.

Crée une annonce naturelle, claire et attractive.

Informations :

Article : ${article}
Taille : ${taille || "non renseignée"}
Couleur : ${couleur || "non renseignée"}
État : ${etat || "non renseigné"}
Prix souhaité : ${prix || "non renseigné"} €
Détails : ${details || "aucun"}

RÈGLES IMPORTANTES :

- N'invente aucune caractéristique.
- N'invente jamais la matière.
- N'invente jamais l'authenticité.
- N'invente jamais le prix neuf.
- N'invente jamais une marque absente des informations.
- Fais une description naturelle.
- Le titre doit être court et efficace.
- Maximum 8 mots-clés.
- Si un prix est indiqué, propose un prix proche et cohérent.
- Si aucun prix n'est indiqué, donne une estimation prudente.

Réponds exactement sous cette forme :

📌 Titre :
...

📝 Description :
...

💰 Prix conseillé :
...

🏷️ Mots-clés :
...
`;

        const response = await fetch(
            "https://openrouter.ai/api/v1/chat/completions",
            {
                method: "POST",

                headers: {
                    "Authorization":
                        `Bearer ${process.env.OPENROUTER_API_KEY}`,

                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    model: "openrouter/free",

                    messages: [
                        {
                            role: "user",
                            content: prompt
                        }
                    ]
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            console.error(
                "ERREUR OPENROUTER :",
                data
            );

            return res.status(response.status).json({
                error:
                    data?.error?.message ||
                    "Erreur de génération."
            });
        }

        const texte =
            data.choices?.[0]?.message?.content;

        if (!texte) {
            throw new Error(
                "L'IA n'a renvoyé aucune annonce."
            );
        }

        res.json({
            result: texte
        });

    } catch (error) {
        console.error(
            "ERREUR SERVEUR :",
            error
        );

        res.status(500).json({
            error: error.message
        });
    }
});


// =============================
// DEMARRAGE
// =============================

const PORT =
    process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(
        `🚀 VintedBoost fonctionne sur le port ${PORT}`
    );
});