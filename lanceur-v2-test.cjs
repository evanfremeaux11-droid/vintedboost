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

console.log("Supabase V2 Test : OK");
console.log("Isolation Supabase : OK");
console.log("Aucune cle de production chargee.");
console.log("Aucun serveur demarre.");
console.log("Lancement V2 non encore autorise.");