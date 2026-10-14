const fs = require("fs");
const dotenv = require("dotenv");
const { spawn } = require("child_process");

const test = dotenv.parse(fs.readFileSync(".env.v2-test"));
const prod = dotenv.parse(fs.readFileSync(".env"));

for (const key of [
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_PUBLISHABLE_KEY"
]) {
  if (!test[key]) throw new Error("Variable manquante : " + key);
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
  STRIPE_PRICE_ID: "",
  STRIPE_WEBHOOK_SECRET: "",
  OPENROUTER_API_KEY: "",
  GEMINI_API_KEY: "",
  EBAY_CLIENT_ID: "",
  EBAY_CLIENT_SECRET: "",
  PORT: "3001",
  NODE_ENV: "development"
};

console.log("Supabase V2 Test : OK");
console.log("Stripe : cle fictive");
console.log("IA et eBay : cles absentes");
console.log("Port : 3001");
console.log("Demarrage du serveur V2...");

const child = spawn(
  process.execPath,
  ["-r", "./bloquer-env-production-v2.cjs", "server.js"],
  {
    env,
    stdio: "inherit"
  }
);

child.on("error", err => {
  console.error("Erreur de demarrage :", err.message);
});

child.on("exit", code => {
  process.exitCode = code || 0;
});