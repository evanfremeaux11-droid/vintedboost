const {
    comparerPrixEntreEtats
} = require("./price-cache");

const ETATS = [
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

function verifierCoherencePrix(article, prixActuels) {
    const position = ETATS.indexOf(normaliser(article.etat));

    const champs = ["prixMin", "prixConseille", "prixMax"];

    const valeurs = champs.map(champ => Number(prixActuels?.[champ]));

    if (
        valeurs.some(valeur => !Number.isFinite(valeur) || valeur <= 0) ||
        valeurs[0] > valeurs[1] ||
        valeurs[1] > valeurs[2]
    ) {
        return {
            coherent: false,
            raison: "Prix invalides",
            anomalies: []
        };
    }

    if (position === -1) {
        return {
            coherent: true,
            comparaisonPossible: false,
            anomalies: []
        };
    }

    const comparaisons = comparerPrixEntreEtats(article);
    const anomalies = [];

    for (const comparaison of comparaisons) {
        for (const champ of champs) {
            const actuel = Number(prixActuels[champ]);
            const reference = Number(comparaison.prix[champ]);

            const incoherent =
                comparaison.position < position
                    ? actuel > reference
                    : actuel < reference;

            if (incoherent) {
                anomalies.push({
                    champ,
                    etatReference: comparaison.etat,
                    prixActuel: actuel,
                    prixReference: reference
                });
            }
        }
    }

    return {
        coherent: anomalies.length === 0,
        comparaisonPossible: comparaisons.length > 0,
        anomalies
    };
}

module.exports = { verifierCoherencePrix };
