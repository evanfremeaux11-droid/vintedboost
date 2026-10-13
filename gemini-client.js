require("dotenv").config();

const MODELE_GEMINI = "gemini-3.1-flash-lite";

async function appelerGemini(messages, options = {}) {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("Cle Gemini non configuree.");
    }

    const parts = [];

    for (const message of messages) {
        const elements = Array.isArray(message.content)
            ? message.content
            : [{ type: "text", text: String(message.content ?? "") }];

        for (const element of elements) {
            if (element.type === "text") {
                parts.push({ text: element.text });
            }

            if (element.type === "image_url") {
                const url = element.image_url?.url;

                if (!url) continue;

                if (url.startsWith("data:")) {
                    const match = url.match(/^data:(image\/[\w.+-]+);base64,(.+)$/s);

                    if (!match) {
                        throw new Error("Format image Base64 invalide.");
                    }

                    parts.push({
                        inline_data: {
                            mime_type: match[1],
                            data: match[2]
                        }
                    });
                } else if (url.startsWith("https://")) {
                    const responseImage = await fetch(url);

                    if (!responseImage.ok) {
                        throw new Error("Impossible de recuperer la photo.");
                    }

                    const mime = responseImage.headers
                        .get("content-type")?.split(";")[0];

                    if (!mime?.startsWith("image/")) {
                        throw new Error("Le fichier distant n'est pas une image.");
                    }

                    const buffer = Buffer.from(await responseImage.arrayBuffer());

                    parts.push({
                        inline_data: {
                            mime_type: mime,
                            data: buffer.toString("base64")
                        }
                    });
                } else {
                    throw new Error("Format URL image non pris en charge.");
                }
            }
        }
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    const debut = Date.now();

    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${MODELE_GEMINI}:generateContent`,
            {
                method: "POST",
                signal: controller.signal,
                headers: {
                    "Content-Type": "application/json",
                    "x-goog-api-key": process.env.GEMINI_API_KEY
                },
                body: JSON.stringify({
                    contents: [{ role: "user", parts }],
                    generationConfig: {
                        temperature: 0.1,
                        maxOutputTokens: options.maxTokens || 1800,
                        responseMimeType: "application/json"
                    }
                })
            }
        );

        const data = await response.json();

        if (!response.ok) {
            const erreur = new Error(
                data.error?.message || "Erreur Gemini."
            );
            erreur.status = response.status;
            throw erreur;
        }

        console.log(
            "GEMINI FINISH REASON :",
            data.candidates?.[0]?.finishReason || "inconnue"
        );

        const texte = data.candidates?.[0]?.content?.parts
            ?.map(part => part.text || "")
            .join("")
            .trim();

        if (!texte) {
            throw new Error("Gemini a renvoye une reponse vide.");
        }

        console.log(
            "GEMINI :", ((Date.now() - debut) / 1000).toFixed(1), "secondes"
        );

        return texte;
    } finally {
        clearTimeout(timeout);
    }
}

module.exports = { appelerGemini };
