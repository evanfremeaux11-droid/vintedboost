const fs = require("fs");
const dotenv = require("dotenv");

const test = dotenv.parse(fs.readFileSync(".env.v2-test"));
const prod = dotenv.parse(fs.readFileSync(".env"));

const required = [
    "SUPABASE_URL",
    "SUPABASE_SERVICE_ROLE_KEY",
    "SUPABASE_PUBLISHABLE_KEY"
];

for (const name of required) {
    if (!test[name]) {
        throw new Error("Variable V2 manquante : " + name);
    }
}

if (
    new URL(test.SUPABASE_URL).hostname ===
    new URL(prod.SUPABASE_URL).hostname
) {
    throw new Error("SECURITE : Supabase V1 detecte.");
}

if (test.V2_QUOTA_RESERVATIONS_ENABLED !== "true") {
    throw new Error("Quotas V2 non actives.");
}

const { spawnSync } = require("child_process");

const env = {
    PATH: process.env.PATH,
    SystemRoot: process.env.SystemRoot,
    TEMP: process.env.TEMP,
    TMP: process.env.TMP,

    SUPABASE_URL: test.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: test.SUPABASE_SERVICE_ROLE_KEY,
    SUPABASE_PUBLISHABLE_KEY: test.SUPABASE_PUBLISHABLE_KEY,

    V2_QUOTA_RESERVATIONS_ENABLED: "true",
    STRIPE_SECRET_KEY: "sk_test_vintedboost_local_only",
    PORT: "3001",
    NODE_ENV: "development"
};

console.log("Supabase V2 Test : OK");
console.log("Stripe : cle fictive");
console.log("OpenRouter, Gemini et eBay : cles absentes");
console.log("Port : 3001");
console.log("Serveur non demarre : verification uniquement");

// Le lancement effectif sera ajoute apres verification