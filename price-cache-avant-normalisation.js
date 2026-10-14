const cache = new Map();

const DUREE_CACHE = 24 * 60 * 60 * 1000;
const MAX_ENTREES = 500;

function creerClePrix(article) {
    const {
        style,
        ...caracteristiques
    } = article;

    return JSON.stringify(
        Object.keys(caracteristiques)
            .sort()
            .map(cle => [
                cle,
                String(caracteristiques[cle] ?? "")
                    .trim()
                    .toLowerCase()
            ])
    );
}

function prixValides(prix) {
    const min = Number(prix?.prixMin);
    const conseille = Number(prix?.prixConseille);
    const max = Number(prix?.prixMax);

    return (
        Number.isFinite(min) &&
        Number.isFinite(conseille) &&
        Number.isFinite(max) &&
        min > 0 &&
        min <= conseille &&
        conseille <= max
    );
}

function obtenirPrixCache(article) {
    const cle = creerClePrix(article);
    const entree = cache.get(cle);

    if (!entree) return null;

    if (Date.now() - entree.date > DUREE_CACHE) {
        cache.delete(cle);
        return null;
    }

    return { ...entree.prix };
}

function enregistrerPrixCache(article, prix) {
    if (!prixValides(prix)) return false;

    const cle = creerClePrix(article);

    if (cache.size >= MAX_ENTREES && !cache.has(cle)) {
        const premiereCle = cache.keys().next().value;
        cache.delete(premiereCle);
    }

    cache.set(cle, {
        date: Date.now(),
        prix: {
            prixMin: String(prix.prixMin),
            prixConseille: String(prix.prixConseille),
            prixMax: String(prix.prixMax)
        }
    });

    return true;
}

function comparerPrixEntreEtats(article) {
    const etats = [
        "neuf avec etiquette",
        "neuf sans etiquette",
        "tres bon etat",
        "bon etat",
        "satisfaisant"
    ];

    function normaliser(texte) {
        return String(texte ?? "")
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .trim()
            .toLowerCase();
    }

    const etatActuel = normaliser(article.etat);
    const position = etats.indexOf(etatActuel);

    if (position === -1) return [];

    const comparaisons = [];

    for (let i = 0; i < etats.length; i++) {
        if (i === position) continue;

        const articleComparable = {
            ...article,
            etat: etats[i]
        };

        const prix = obtenirPrixCache(articleComparable);

        if (prix) {
            comparaisons.push({
                etat: etats[i],
                position: i,
                prix
            });
        }
    }

    return comparaisons;
}
module.exports = {
    obtenirPrixCache,
    enregistrerPrixCache,
    comparerPrixEntreEtats
};
