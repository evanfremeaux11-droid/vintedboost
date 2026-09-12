const express = require("express");
require("dotenv").config();

const app = express();

app.use(express.json());
app.use(express.static(__dirname));

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

        if (!article || !taille || !couleur || !etat) {
            return res.status(400).json({
                error: "Informations manquantes."
            });
        }

        const prompt = `
Tu es un expert Vinted spécialisé dans la vente de vêtements d'occasion.

Ta mission :
Créer une annonce claire, crédible, naturelle et attractive.

Tu ne dois JAMAIS inventer d'informations.

Informations connues :

Article : ${article}
Taille : ${taille}
Couleur : ${couleur}
État : ${etat}
Prix souhaité : ${prix || "non renseigné"} €
Détails : ${details || "aucun détail supplémentaire"}

Consignes importantes :

- Fais un titre court et efficace.
- Ne mets pas de phrases inutiles.
- Utilise un ton naturel, comme un vrai vendeur Vinted.
- N'invente jamais la matière, la provenance, le prix neuf ou l'authenticité.
- Si le prix semble cohérent, tu peux proposer un prix légèrement différent.
- Donne maximum 8 mots-clés pertinents.
- Ne mets pas trop d'emojis.
- Évite les expressions trop commerciales ou artificielles.

Réponds exactement dans ce format :

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
                    "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
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
            console.error("ERREUR OPENROUTER :", data);

            return res.status(response.status).json({
                error:
                    data?.error?.message ||
                    "Erreur lors de la génération."
            });
        }

        const texte = data.choices?.[0]?.message?.content;

        if (!texte) {
            throw new Error("L'IA n'a renvoyé aucun texte.");
        }

        res.json({
            result: texte
        });

    } catch (error) {
        console.error("ERREUR SERVEUR :", error);

        res.status(500).json({
            error: error.message
        });
    }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
    console.log(`🚀 VintedBoost fonctionne sur le port ${PORT}`);
});