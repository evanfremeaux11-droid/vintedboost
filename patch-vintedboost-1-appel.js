const fs = require('fs');

const path = './server.js';
let s = fs.readFileSync(path, 'utf8');

fs.copyFileSync(path, './server-avant-correction-1-appel.js');

s = s.replace(/const MAX_TENTATIVES\s*=\s*\d+\s*;/, 'const MAX_TENTATIVES = 1;');
s = s.replace(/const MODELE\s*=\s*[^;]+;/, 'const MODELE = "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free";');

const startMarker = 'GENERATION ANNONCE';
const endMarker = 'STRIPE CHECKOUT PREMIUM';
const startLabel = s.indexOf(startMarker);
const endLabel = s.indexOf(endMarker);
if (startLabel < 0 || endLabel < 0 || endLabel <= startLabel) {
  throw new Error('Impossible de trouver la section GENERATION ANNONCE / STRIPE CHECKOUT PREMIUM.');
}
const start = s.lastIndexOf('/*', startLabel);
const end = s.lastIndexOf('/*', endLabel);
if (start < 0 || end < 0) throw new Error('Bornes de remplacement introuvables.');

const route = `/* ======================================================
   GENERATION ANNONCE — ANALYSE + ANNONCE EN 1 APPEL IA
====================================================== */

app.post(
    "/generate",
    limiterRequetes,
    async (req, res) => {
        const debut = Date.now();

        try {
            const sessionQuota = await verifierUtilisateurEtQuota(req);

            let images = Array.isArray(req.body?.images) ? req.body.images : [];
            images = images
                .slice(0, MAX_PHOTOS)
                .filter(image =>
                    typeof image === "string" &&
                    /^data:image\\/(jpeg|jpg|png|webp);base64,/i.test(image)
                );

            const article = nettoyerTexte(req.body?.article, 100);
            const marque = nettoyerTexte(req.body?.marque, 100);
            const categorie = nettoyerTexte(req.body?.categorie, 100);
            const taille = nettoyerTexte(req.body?.taille, 50);
            const couleur = nettoyerTexte(req.body?.couleur, 100);
            const etat = nettoyerTexte(req.body?.etat, 50);
            const prix = nettoyerTexte(req.body?.prix, 20);
            const details = nettoyerTexte(req.body?.details, 1000);
            const defauts = nettoyerTexte(req.body?.defauts, 500);
            const style = nettoyerTexte(req.body?.style, 30);
            const plateforme = nettoyerTexte(req.body?.plateforme, 30);

            if (!article && images.length === 0) {
                return res.status(400).json({
                    error: "Ajoute au moins une photo ou indique le type d'article."
                });
            }

            const consigneStyle = obtenirStyle(style);
            const consignePlateforme = obtenirPlateforme(plateforme);

            const prompt = \`
Analyse les photos du même article d'occasion et crée directement son annonce de vente.
Utilise en priorité les informations fournies par l'utilisateur lorsqu'elles existent.

Plateforme : \${consignePlateforme}
Style : \${consigneStyle}
Article indiqué : \${article || "inconnu"}
Marque indiquée : \${marque || "inconnue"}
Catégorie indiquée : \${categorie || "inconnue"}
Taille indiquée : \${taille || "inconnue"}
Couleur indiquée : \${couleur || "inconnue"}
État indiqué : \${etat || "inconnu"}
Prix envisagé : \${prix ? prix + " €" : "non renseigné"}
Détails indiqués : \${details || "aucun"}
Défauts indiqués : \${defauts || "aucun renseigné"}

Retourne UNIQUEMENT un objet JSON valide avec exactement ces clés :
{
  "article":"",
  "marque":"",
  "categorie":"",
  "couleur":"",
  "tailleVisible":"",
  "etat":"",
  "details":"",
  "defauts":"",
  "titre":"",
  "description":"",
  "prixConseille":"",
  "prixMin":"",
  "prixMax":"",
  "motsCles":[]
}

Règles :
- un seul objet JSON, aucun Markdown, aucun texte autour ;
- n'invente jamais marque, taille, matière, modèle, défaut, prix neuf, authenticité, rareté ou livraison ;
- si une information n'est ni fournie ni clairement visible, utilise "" ;
- categorie uniquement parmi : Veste, Sweat, T-shirt, Pantalon, Jean, Chaussures, Accessoire, Robe, Chemise, Pull, Short, Autre ;
- etat uniquement parmi : Neuf avec étiquette, Neuf sans étiquette, Très bon état, Bon état, État satisfaisant, ou "" ;
- ne dis jamais "aucun défaut" si aucun défaut n'a pu être vérifié ;
- titre clair, naturel et utile ;
- description naturelle en plusieurs lignes courtes ;
- commence par 1 ou 2 phrases présentant l'article ;
- taille, couleur et état peuvent ensuite apparaître sur des lignes séparées quand ils sont connus ;
- pas de fausse urgence ni de phrase générique du type "n'hésitez pas" ;
- maximum 8 mots-clés réellement pertinents ;
- n'ajoute pas vintage, rare, collector ou édition limitée sauf preuve explicite ;
- prix = estimation indicative ;
- prixConseille, prixMin et prixMax = nombres entiers sous forme de texte ;
- prixMin <= prixConseille <= prixMax.
            \`.trim();

            const contenu = [{ type: "text", text: prompt }];
            for (const image of images) {
                contenu.push({ type: "image_url", image_url: { url: image } });
            }

            const annonce = await appelerIAJSON(
                [{ role: "user", content: contenu }],
                { maxTokens: 1800 }
            );

            let motsCles = Array.isArray(annonce?.motsCles)
                ? annonce.motsCles.map(mot => nettoyerTexte(mot, 50)).filter(Boolean)
                : [];

            const interdits = /^(vintage|rare|collector|édition limitée|edition limitee)$/i;
            motsCles = [...new Set(motsCles.filter(mot => !interdits.test(mot)))].slice(0, 8);

            let description = nettoyerTexte(annonce?.description, 2000)
                .replace(/navy blue/gi, "bleu marine")
                .replace(/\\b(envoi|expédition)\\s+(soigné[e]?\\s+)?(sous|en)\\s+\\d+\\s*h(eures?)?\\b[^.]*\\.?/gi, "")
                .replace(/n['’]hésitez pas[^.]*\\.?/gi, "")
                .replace(/aucun défaut (signalé|visible)[^.]*\\.?/gi, "")
                .replace(/état parfait/gi, etat || "état à vérifier")
                .replace(/\\n{3,}/g, "\\n\\n")
                .trim();

            const resultat = {
                article: nettoyerTexte(annonce?.article || article, 100),
                marque: nettoyerTexte(annonce?.marque || marque, 100),
                categorie: nettoyerTexte(annonce?.categorie || categorie, 100),
                couleur: nettoyerTexte(annonce?.couleur || couleur, 100).replace(/navy blue/gi, "bleu marine"),
                tailleVisible: nettoyerTexte(annonce?.tailleVisible || taille, 50),
                etat: nettoyerTexte(annonce?.etat || etat, 50),
                details: nettoyerTexte(annonce?.details || details, 700),
                defauts: nettoyerTexte(annonce?.defauts || defauts, 500),
                titre: nettoyerTexte(annonce?.titre, 160).replace(/navy blue/gi, "bleu marine"),
                description,
                prixConseille: nettoyerTexte(annonce?.prixConseille, 20),
                prixMin: nettoyerTexte(annonce?.prixMin, 20),
                prixMax: nettoyerTexte(annonce?.prixMax, 20),
                motsCles
            };

            if (!resultat.titre || !resultat.description) {
                throw new Error("Annonce IA incomplète.");
            }

            console.log(\`✨ Analyse + annonce en 1 appel : \${((Date.now() - debut) / 1000).toFixed(1)}s\`);

            try {
                const { error: analyticsError } = await sessionQuota.supabase.rpc(
                    "track_event",
                    { event_name_input: "generation" }
                );
                if (analyticsError) console.error("Erreur analytics generation :", analyticsError.message);
            } catch (analyticsError) {
                console.error("Erreur analytics generation :", analyticsError.message);
            }

            return res.json({ ...resultat, quota: sessionQuota.quota });

        } catch (error) {
            console.error("❌ GENERATION :", error.message);
            return res.status(error.status || 500).json({
                error: error.status ? error.message : "La génération a échoué. Réessaie dans quelques secondes.",
                code: error.code || undefined,
                quota: error.quota || undefined
            });
        }
    }
);

`;

s = s.slice(0, start) + route + s.slice(end);
fs.writeFileSync(path, s, 'utf8');
console.log('OK - server.js corrigé : analyse + annonce en 1 appel IA.');
console.log('Sauvegarde créée : server-avant-correction-1-appel.js');
