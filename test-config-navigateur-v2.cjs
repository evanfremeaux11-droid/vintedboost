const fs = require("fs");
const dotenv = require("dotenv");

async function main() {
  const test = dotenv.parse(fs.readFileSync(".env.v2-test"));
  const prod = dotenv.parse(fs.readFileSync(".env"));

  const response = await fetch(
    "http://127.0.0.1:3001/supabase-config",
    { signal: AbortSignal.timeout(10000) }
  );

  if (!response.ok) {
    throw new Error("Configuration HTTP : " + response.status);
  }

  const config = await response.json();

  const testUrl = new URL(test.SUPABASE_URL).origin;
  const prodUrl = new URL(prod.SUPABASE_URL).origin;

  if (testUrl === prodUrl) {
    throw new Error("SECURITE : Supabase V1 et V2 identiques.");
  }

  if (config.url !== testUrl) {
    throw new Error("Le serveur ne transmet pas l'URL Supabase V2 Test.");
  }

  if (config.publishableKey !== test.SUPABASE_PUBLISHABLE_KEY) {
    throw new Error("La cle publique ne correspond pas au projet V2 Test.");
  }

  console.log("Route /supabase-config : HTTP 200");
  console.log("URL Supabase V2 Test : OK");
  console.log("Cle publique Supabase V2 Test : OK");
  console.log("Configuration navigateur : VALIDEE");
  console.log("Aucune cle affichee.");
}

main().catch(error => {
  console.error("ECHEC :", error.message);
  process.exitCode = 1;
});