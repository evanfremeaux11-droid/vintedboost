const fs = require("fs");
const dotenv = require("dotenv");

const test = dotenv.parse(fs.readFileSync(".env.v2-test"));
const prod = dotenv.parse(fs.readFileSync(".env"));

const html = fs.readFileSync("index.html", "utf8");
const server = fs.readFileSync("server.js", "utf8");

const verifications = {
  "Interface utilise config.url": html.includes("config.url"),
  "Interface utilise config.publishableKey": html.includes("config.publishableKey"),
  "Serveur utilise SUPABASE_URL": server.includes("process.env.SUPABASE_URL"),
  "Serveur utilise SUPABASE_PUBLISHABLE_KEY": server.includes("SUPABASE_PUBLISHABLE_KEY"),
  "Supabase V1 et V2 distincts":
    new URL(test.SUPABASE_URL).hostname !==
    new URL(prod.SUPABASE_URL).hostname,
  "Quotas V2 actives":
    test.V2_QUOTA_RESERVATIONS_ENABLED === "true"
};

for (const [nom, ok] of Object.entries(verifications)) {
  console.log((ok ? "OK" : "ECHEC") + " : " + nom);
}

if (Object.values(verifications).some(ok => !ok)) {
  process.exitCode = 1;
}

console.log("Aucune cle affichee.");
console.log("Aucune requete externe effectuee.");