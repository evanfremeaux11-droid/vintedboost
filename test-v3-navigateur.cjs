const { chromium } = require("@playwright/test");

(async () => {
  const browser = await chromium.launch({ headless: true });
  const pages = [
    "/pro-v3/",
    "/pro-v3/dressing.html",
    "/pro-v3/analytics.html",
    "/pro-v3/assistant.html",
    "/pro-v3/prix.html",
    "/pro-v3/parametres.html",
    "/studio-v3"
  ];

  let erreurs = 0;

  for (const route of pages) {
    const page = await browser.newPage();

    const response = await page.goto(
      "http://localhost:3002" + route,
      { waitUntil: "domcontentloaded", timeout: 15000 }
    );

    await page.waitForTimeout(1500);

    const titre = await page.title();
    const contenu = await page.locator("body").innerText();

    if (response?.status() === 200 && contenu.trim().length > 50) {
      console.log("OK :", route, "|", titre);
    } else {
      console.log("ERREUR :", route);
      erreurs++;
    }

    await page.close();
  }

  await browser.close();

  console.log("\nRESULTAT :", erreurs, "erreur(s)");
})().catch(error => {
  console.error("ECHEC DU TEST :", error.message);
  process.exitCode = 1;
});
