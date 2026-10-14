const fs = require("fs");
const dotenv = require("dotenv");

const test = dotenv.parse(fs.readFileSync(".env.v2-test"));
const prod = dotenv.parse(fs.readFileSync(".env"));

const required = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_PUBLISHABLE_KEY"
];

for (const key of required) {
    if (!test[key]) {
        throw new Error("Configuration V2 incomplete : " + key);
    }
}

if (
    new URL(test.SUPABASE_URL).hostname ===
    new URL(prod.SUPABASE_URL).hostname
) {
    throw new Error("SECURITE : V1 et V2 utilisent le meme Supabase.");
}

if (test.V2_QUOTA_RESERVATIONS_ENABLED !== "true") {
    throw new Error("Quotas V2 desactives.");
}

console.log("Projet Supabase V2 distinct : OK");
console.log("Identifiants V2 presents : OK");
console.log("Quotas V2 actives : OK");
console.log("Configuration prete pour un lancement isole.");
console.log("Aucun serveur demarre.");