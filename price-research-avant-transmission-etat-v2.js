
const { rechercherAnnonces } = require("./ebay-prices");

const {
    nettoyerAnnonces,
    calculerEstimation,
    filtrerAnnoncesComparables
} = require("./market-prices");

async function rechercherPrixArticle(article, options = {}) {
    if (!article || typeof article !== "object") {
        throw new Error("Les informations de l'article sont nécessaires.");
    }

    const marque = String(article.marque || "").trim();
    const categorie = String(article.categorie || "").trim();
    const taille = String(article.taille || "").trim();
    const modele = String(article.modele || "").trim();
    const etat = String(article.etat || '').trim();

    if (!marque || !categorie) {
        return {
            disponible: false,
            message: "Précise au minimum la marque et la catégorie.",
            nombreComparables: 0,
            prixBas: null,
            prixConseille: null,
            prixHaut: null
        };
    }

    const recherche = [
        marque,
        modele,
        categorie,
        taille
    ].filter(Boolean).join(" ");

    const annoncesBrutes = await rechercherAnnonces(recherche, {
        limit: options.limit || 50,
        marketplace: "EBAY_FR"
    });

    const annoncesNettoyees = nettoyerAnnonces(annoncesBrutes);

    const comparables = filtrerAnnoncesComparables(
        annoncesNettoyees,
        {
            marque,
            categorie,
            taille
        , modele}
    );

    if (comparables.length < 3) {
        return {
            disponible: false,
            source: "eBay",
            message: "Moins de trois annonces comparables ont été trouvées.",
            nombreComparables: comparables.length,
            prixBas: null,
            prixConseille: null,
            prixHaut: null,
            annonces: comparables
        };
    }

    const estimation = calculerEstimation(comparables);

    return {
        ...estimation,
        source: "eBay",
        annonces: comparables.map((annonce) => ({
            titre: annonce.titre,
            prix: annonce.prix,
            devise: annonce.devise,
            url: annonce.url,
            etat: annonce.etat
        }))
    };
}

module.exports = {
    rechercherPrixArticle
};
