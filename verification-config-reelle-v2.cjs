const fs = require("fs");
const dotenv = require("dotenv");

async function main() {
    const test = dotenv.parse(fs.readFileSync(".env.v2-test"));
    const prod = dotenv.parse(fs.readFileSync(".env"));

    const urlTest = new URL(test.SUPABASE_URL).origin;
    const urlProd = new URL(prod.SUPABASE_URL).origin;

    if (urlTest === urlProd) {
        throw new Error("SECURITE : projets Supabase identiques.");
    }

    const response = await fetch("http://127.0.0.1:3001/", {
        signal: AbortSignal.timeout(10000)
    });

    if (!response.ok) {
        throw new Error("Serveur HTTP : " + response.status);
    }

    console.log("Serveur V2 : HTTP " + response.status);

    const server = fs.readFileSync("server.js", "utf8");

    const routes = [...server.matchAll(
        /app\.get\(\s*["']([^"']+)["']/g
    )].map(match => match[1]);

    const candidates = routes.filter(route =>
        /config|supabase|auth/i.test(route)
    );

    console.log("Routes de configuration detectees :");

    if (candidates.length === 0) {
        console.log("Aucune route explicite trouvee.");
    } else {
        candidates.forEach(route => console.log("  " + route));
    }

    console.log("Aucune cle privee affichee.");
    console.log("Aucune generation IA lancee.");
}

main().catch(error => {
    console.error("ERREUR :", error.message);
    process.exitCode = 1;
});