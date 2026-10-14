const fs = require("fs");
const dotenv = require("dotenv");

const config = dotenv.parse(
    fs.readFileSync(".env.v2-test")
);

const required = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_PUBLISHABLE_KEY"
];

for (const name of required) {
    if (!config[name] || !config[name].trim()) {
        throw new Error("Variable manquante : " + name);
    }
}

const url = new URL(config.SUPABASE_URL);

if (
    url.protocol !== "https:" ||
    !url.hostname.endsWith(".supabase.co")
) {
    throw new Error("URL Supabase invalide");
}

if (config.V2_QUOTA_RESERVATIONS_ENABLED !== "true") {
    throw new Error("Activation des quotas V2 incorrecte");
}

console.log("Configuration Supabase V2 Test : OK");
console.log("Activation des quotas V2 : OK");
console.log("Aucune cle privee affichee.");
console.log("Aucune connexion Supabase effectuee.");
console.log("Aucun serveur demarre.");