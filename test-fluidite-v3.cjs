const { chromium } = require("@playwright/test");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const erreurs = [];

  page.on("pageerror", e => erreurs.push(e.message));

  await page.goto(
    "http://localhost:3002/pro-v3/assistant.html",
    { waitUntil: "networkidle" }
  );

  const resultats = {
    "Page accessible": (await page.title()).includes("Assistant"),
    "Chatbot présent": await page.locator(
      'script[src*="chatbot-v3-ui"], [class*="chatbot"], [id*="chatbot"]'
    ).count() > 0,
    "Correctif fluidité chargé": await page.locator(
      'script[src*="fluidite-v3"]'
    ).count() > 0,
    "Aucune erreur JavaScript": erreurs.length === 0
  };

  for (const [nom, ok] of Object.entries(resultats)) {
    console.log(`${ok ? "OK" : "ERREUR"} : ${nom}`);
  }

  if (erreurs.length) {
    console.log("Erreurs JS :", erreurs.join(" | "));
  }

  await browser.close();

  if (Object.values(resultats).some(ok => !ok)) {
    process.exitCode = 1;
  }
})().catch(e => {
  console.error("ECHEC :", e.message);
  process.exitCode = 1;
});
