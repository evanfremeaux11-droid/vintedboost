const fs = require("fs");
const dotenv = require("dotenv");
const { createClient } = require("@supabase/supabase-js");

const test = dotenv.parse(fs.readFileSync(".env.v2-test"));
const prod = dotenv.parse(fs.readFileSync(".env"));

function hostname(value) {
  return new URL(value).hostname.toLowerCase();
}

if (
  !test.SUPABASE_URL ||
  !test.SUPABASE_SERVICE_ROLE_KEY ||
  !prod.SUPABASE_URL ||
  hostname(test.SUPABASE_URL) === hostname(prod.SUPABASE_URL)
) {
  throw new Error("SECURITE : configuration Supabase V2 invalide.");
}

if (test.V2_QUOTA_RESERVATIONS_ENABLED !== "true") {
  throw new Error("Quotas V2 non actives.");
}

const supabase = createClient(
  test.SUPABASE_URL,
  test.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { persistSession: false, autoRefreshToken: false } }
);

async function rpc(name, args) {
  const { data, error } = await supabase.rpc(name, args);
  if (error) throw new Error(name + " : " + error.message);
  return data;
}

async function main() {
  console.log("Connexion au projet Supabase V2 Test...");

  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("id, plan, generations_used, generations_limit")
    .limit(10);

  if (error) throw error;

  const profile = profiles.find(p =>
    p.plan === "libre" &&
    p.generations_used === 0 &&
    p.generations_limit === 5
  );

  if (!profile) {
    throw new Error(
      "Aucun profil de test libre avec 0/5 generation trouve. Aucun quota modifie."
    );
  }

  const id = profile.id;
  let reservation = null;

  async function used() {
    const { data, error } = await supabase
      .from("profiles")
      .select("generations_used")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data.generations_used;
  }

  try {
    console.log("Test 1 : reservation puis remboursement");

    const first = await rpc("reserve_generation_v2", {
      p_user_id: id
    });

    if (!first.allowed || !first.reservation_id) {
      throw new Error("Reservation refusee.");
    }

    reservation = first.reservation_id;

    if (await used() !== 1) {
      throw new Error("Le quota n'est pas passe de 0 a 1.");
    }

    const refunded = await rpc("refund_generation_v2", {
      p_reservation_id: reservation
    });

    if (refunded !== true || await used() !== 0) {
      throw new Error("Echec du remboursement.");
    }

    reservation = null;
    console.log("OK : reservation et remboursement");

    console.log("Test 2 : reservation puis finalisation");

    const second = await rpc("reserve_generation_v2", {
      p_user_id: id
    });

    if (!second.allowed || !second.reservation_id) {
      throw new Error("Deuxieme reservation refusee.");
    }

    reservation = second.reservation_id;

    const completed = await rpc("complete_generation_v2", {
      p_reservation_id: reservation
    });

    if (completed !== true || await used() !== 1) {
      throw new Error("Echec de la finalisation.");
    }

    reservation = null;

    console.log("OK : generation finalisee, quota 1/5");
    console.log("TESTS API V2 REUSSIS");
  } finally {
    if (reservation) {
      const refunded = await rpc("refund_generation_v2", {
        p_reservation_id: reservation
      });
      console.log(
        refunded
          ? "Reservation en attente remboursee."
          : "Reservation non remboursee : verifier son statut."
      );
    }
  }
}

main().catch(err => {
  console.error("ECHEC DU TEST :", err.message);
  process.exitCode = 1;
});