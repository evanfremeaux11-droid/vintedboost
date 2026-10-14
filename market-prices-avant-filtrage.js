
function nettoyerPrix(prix) {
    if (typeof prix !== "number" || !Number.isFinite(prix) || prix <= 0) {
        return null;
    }

    return Math.round(prix * 100) / 100;
}

function calculerEstimation(annonces = []) {
    const prix = annonces
        .map((annonce) => nettoyerPrix(annonce.prix))
        .filter((valeur) => valeur !== null)
        .sort((a, b) => a - b);

    if (prix.length < 3) {
        return {
            disponible: false,
            message: "Pas assez d'annonces comparables pour estimer le prix.",
            nombreComparables: prix.length,
            prixBas: null,
            prixConseille: null,
            prixHaut: null
        };
    }

    const milieu = Math.floor(prix.length / 2);
    const mediane = prix.length % 2
        ? prix[milieu]
        : (prix[milieu - 1] + prix[milieu]) / 2;

    return {
        disponible: true,
        source: "annonces comparables fournies",
        nombreComparables: prix.length,
        prixBas: Math.round(mediane * 0.8),
        prixConseille: Math.round(mediane),
        prixHaut: Math.round(mediane * 1.2)
    };
}

module.exports = {
    calculerEstimation
};
