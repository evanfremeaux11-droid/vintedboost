
const EBAY_API_BASE = "https://api.ebay.com";

function obtenirIdentifiants() {
    const clientId = process.env.EBAY_CLIENT_ID;
    const clientSecret = process.env.EBAY_CLIENT_SECRET;

    if (!clientId || !clientSecret) {
        throw new Error(
            "Identifiants eBay absents. Configure EBAY_CLIENT_ID et EBAY_CLIENT_SECRET dans .env."
        );
    }

    return { clientId, clientSecret };
}

async function lireReponse(response) {
    const texte = await response.text();

    try {
        return texte ? JSON.parse(texte) : {};
    } catch {
        throw new Error(
            `Réponse eBay illisible (HTTP ${response.status}).`
        );
    }
}

async function obtenirJeton() {
    const { clientId, clientSecret } = obtenirIdentifiants();

    const credentials = Buffer
        .from(`${clientId}:${clientSecret}`)
        .toString("base64");

    const response = await fetch(
        `${EBAY_API_BASE}/identity/v1/oauth2/token`,
        {
            method: "POST",
            headers: {
                Authorization: `Basic ${credentials}`,
                "Content-Type": "application/x-www-form-urlencoded"
            },
            body: new URLSearchParams({
                grant_type: "client_credentials",
                scope: "https://api.ebay.com/oauth/api_scope"
            }),
            signal: AbortSignal.timeout(15000)
        }
    );

    const data = await lireReponse(response);

    if (!response.ok || !data.access_token) {
        throw new Error(
            `Authentification eBay impossible (HTTP ${response.status}). Vérifie l'accès API et les identifiants.`
        );
    }

    return data.access_token;
}

async function rechercherAnnonces(query, options = {}) {
    if (typeof query !== "string" || !query.trim()) {
        throw new Error("Une recherche produit est nécessaire.");
    }

    const limit = Math.max(
        1,
        Math.min(Number(options.limit) || 20, 50)
    );

    const token = await obtenirJeton();

    const url = new URL(
        `${EBAY_API_BASE}/buy/browse/v1/item_summary/search`
    );

    url.searchParams.set("q", query.trim());
    url.searchParams.set("limit", String(limit));
    url.searchParams.set("sort", "price");

    if (options.categoryId) {
        url.searchParams.set("category_ids", String(options.categoryId));
    }

    const marketplace = options.marketplace || "EBAY_FR";

    const response = await fetch(url, {
        headers: {
            Authorization: `Bearer ${token}`,
            "X-EBAY-C-MARKETPLACE-ID": marketplace
        },
        signal: AbortSignal.timeout(15000)
    });

    const data = await lireReponse(response);

    if (!response.ok) {
        throw new Error(
            `Recherche eBay impossible (HTTP ${response.status}). Vérifie les autorisations de l'API.`
        );
    }

    return (Array.isArray(data.itemSummaries) ? data.itemSummaries : [])
        .map((item) => ({
            titre: item.title || "",
            prix: Number(item.price?.value),
            devise: item.price?.currency || "",
            url: item.itemWebUrl || "",
            source: "eBay",
            etat: item.condition || null
        }))
        .filter((item) =>
            Number.isFinite(item.prix) &&
            item.prix > 0 &&
            item.devise === "EUR" &&
            item.titre.length > 0
        );
}

module.exports = {
    rechercherAnnonces
};
