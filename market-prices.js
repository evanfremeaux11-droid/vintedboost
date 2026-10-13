
function nettoyerAnnonces(annonces = []) {
    if (!Array.isArray(annonces)) return [];

    const liensVus = new Set();

    return annonces
        .filter((annonce) => {
            const lien = String(annonce?.url || "").trim();

            if (lien) {
                if (liensVus.has(lien)) return false;
                liensVus.add(lien);
            }
            if (!annonce || typeof annonce.prix !== "number") {
                return false;
            }

            if (!Number.isFinite(annonce.prix) || annonce.prix <= 0) {
                return false;
            }

            if (annonce.devise && annonce.devise !== "EUR") {
                return false;
            }

            return true;
        })
        .map((annonce) => ({
            ...annonce,
            prix: Math.round(annonce.prix * 100) / 100
        }));
}

function mediane(valeurs) {
    const tries = [...valeurs].sort((a, b) => a - b);
    const milieu = Math.floor(tries.length / 2);

    return tries.length % 2
        ? tries[milieu]
        : (tries[milieu - 1] + tries[milieu]) / 2;
}

function calculerEstimation(annonces = []) {
    const valides = nettoyerAnnonces(annonces);

    if (valides.length < 3) {
        return {
            disponible: false,
            message: "Pas assez d'annonces comparables en euros.",
            nombreComparables: valides.length,
            prixBas: null,
            prixConseille: null,
            prixHaut: null
        };
    }

    let prix = valides.map((annonce) => annonce.prix);
    let filtres = [...prix].sort((a, b) => a - b);

    if (filtres.length >= 5) {
        const milieu = Math.floor(filtres.length / 2);
        const moitieBasse = filtres.slice(0, milieu);
        const moitieHaute = filtres.slice(
            filtres.length % 2 ? milieu + 1 : milieu
        );

        const q1 = mediane(moitieBasse);
        const q3 = mediane(moitieHaute);
        const ecart = q3 - q1;

        filtres = filtres.filter(
            (valeur) =>
                valeur >= q1 - 1.5 * ecart &&
                valeur <= q3 + 1.5 * ecart
        );
    }

    if (filtres.length < 3) {
        return {
            disponible: false,
            message: "Les prix sont trop dispersés pour une estimation fiable.",
            nombreComparables: filtres.length,
            prixBas: null,
            prixConseille: null,
            prixHaut: null
        };
    }

    const reference = mediane(filtres);

    return {
        disponible: true,
        source: "annonces comparables fournies",
        nombreComparables: filtres.length,
        prixBas: Math.round(reference * 0.8),
        prixConseille: Math.round(reference),
        prixHaut: Math.round(reference * 1.2)
    };
}

function normaliserTexte(valeur) {
    return String(valeur || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
}

function filtrerAnnoncesComparables(annonces, article) {
    if (!Array.isArray(annonces) || !article) {
        return [];
    }

    const marque = normaliserTexte(article.marque);
    const categorie = normaliserTexte(article.categorie);
    const taille = normaliserTexte(article.taille);
    const modele = normaliserTexte(article.modele);
    const etat = normaliserTexte(article.etat);

    return annonces.filter((annonce) => {
        if (!annonce || !annonce.titre) return false;

        const titre = normaliserTexte(annonce.titre);

        if (etat) {
            const etatAnnonce = normaliserTexte(annonce.etat);

            // Sans état eBay connu, on écarte l'annonce.
            if (!etatAnnonce) return false;

            const articleNeuf = etat.startsWith("neuf");
            const annonceNeuve =
                /\b(new|brand new|neuf|neu)\b/.test(etatAnnonce) &&
                !/\b(open box|opened|occasion|used|pre-owned)\b/.test(etatAnnonce);

            const annonceOccasion =
                /\b(used|pre-owned|preowned|occasion)\b/.test(etatAnnonce);

            const annonceEndommagee =
                /\b(for parts|not working|broken|damaged|defective)\b/.test(etatAnnonce);

            if (annonceEndommagee) return false;

            if (articleNeuf && !annonceNeuve) return false;
            if (!articleNeuf && !annonceOccasion) return false;
        }
        if (marque) {
            const motsTitre = titre.match(/[\p{L}\p{N}]+/gu) || [];
            const motsMarque = marque.match(/[\p{L}\p{N}]+/gu) || [];

            const marqueTrouvee = motsMarque.length > 0 &&
                motsMarque.some((_, index) =>
                    motsTitre.some((mot, position) =>
                        motsMarque.every((motMarque, decalage) =>
                            motsTitre[position + decalage] === motMarque
                        )
                    )
                );

            if (!marqueTrouvee) return false;
        }

        if (modele) {
            const motsModele = modele.match(/[\p{L}\p{N}]+/gu) || [];
            const motsTitre = titre.match(/[\p{L}\p{N}]+/gu) || [];

            const modeleTrouve = motsModele.length > 0 &&
                motsTitre.some((_, position) =>
                    motsModele.every((mot, decalage) =>
                        motsTitre[position + decalage] === mot
                    )
                );

            if (!modeleTrouve) return false;
        }
        if (categorie) {
            const motsTitre = titre.match(/[\p{L}\p{N}]+/gu) || [];
            const motsCategorie = categorie
                .match(/[\p{L}\p{N}]+/gu) || [];

            const contientMot = (mot) => motsTitre.includes(mot);

            const estSweatCapuche =
                motsCategorie.includes("sweat") &&
                motsCategorie.includes("capuche");

            if (estSweatCapuche) {
                const correspond =
                    contientMot("hoodie") ||
                    contientMot("hoodies") ||
                    (
                        contientMot("sweat") &&
                        contientMot("capuche")
                    );

                if (!correspond) return false;
            } else {
                const motsUtiles = motsCategorie
                    .filter((mot) => mot.length > 2);

                if (
                    motsUtiles.length > 0 &&
                    !motsUtiles.every((mot) => contientMot(mot))
                ) {
                    return false;
                }
            }
        }

        if (taille) {
            const tailleAnnonce = normaliserTexte(annonce.taille);

            if (tailleAnnonce) {
                if (tailleAnnonce !== taille) return false;
            } else {
                const tailleEchappee = taille.replace(
                    /[.*+?^${}()|[\]\\]/g,
                    "\\$&"
                );

                const expressionTaille = new RegExp(
                    `(^|\\s|[-,])${tailleEchappee}($|\\s|[-,])`,
                    "i"
                );

                if (!expressionTaille.test(titre)) {
                    return false;
                }
            }
        }

        return true;
    });
}

module.exports = {
    nettoyerAnnonces,
    calculerEstimation,
    filtrerAnnoncesComparables
};
