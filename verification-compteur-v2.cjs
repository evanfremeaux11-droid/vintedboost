const fs = require("fs");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

async function main() {
  const test = dotenv.parse(fs.readFileSync(".env.v2-test"));
  const prod = dotenv.parse(fs.readFileSync(".env"));

  if (
    new URL(test.SUPABASE_URL).hostname ===
    new URL(prod.SUPABASE_URL).hostname
  ) {
    throw new Error("SECURITE : projet de production detecte.");
  }

  const supabase = createClient(
    test.SUPABASE_URL,
    test.SUPABASE_SERVICE_ROLE_KEY
  );

  const { data, error } = await supabase
    .from("profiles")
    .select("plan, generations_used, generations_limit, quota_month");

  if (error) throw error;

  for (const profil of data) {
    console.log("Plan :", profil.plan);
    console.log("Generations utilisees :", profil.generations_used);
    console.log("Limite :", profil.generations_limit);
    console.log("Mois du quota :", profil.quota_month);
  }

  console.log("Lecture seule : aucune modification.");
}

main().catch(e => {
  console.error("ERREUR :", e.message);
  process.exitCode = 1;
});