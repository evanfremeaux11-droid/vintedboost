try {
    const Stripe = require("stripe");

    const stripe = Stripe("sk_test_vintedboost_local_only");

    console.log("Stripe : initialisation locale OK");
    console.log("Cle fictive utilisee : OUI");
    console.log("Aucun appel reseau effectue.");
    console.log("Aucun paiement effectue.");
} catch (error) {
    console.error("Stripe : initialisation impossible");
    console.error(error.message);
    process.exitCode = 1;
}