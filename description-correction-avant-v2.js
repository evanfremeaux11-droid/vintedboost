function corrigerDescription(description) {
    const texte = String(description || "");

    const lignes = texte.split(/\r?\n/);
    const details = lignes.find(ligne =>
        ligne.trim().startsWith("\u{1F9F5}")
    );

    if (!details) return texte;

    return lignes.map(ligne => {
        if (ligne.trim().startsWith("\u{1F9F5}")) {
            return ligne;
        }

        const match = ligne.match(
            /^(.*?)(?: avec col montant et manches longues)\.$/i
        );

        if (
            match &&
            /col montant/i.test(details) &&
            /manches longues/i.test(details)
        ) {
            return match[1] + ".";
        }

        return ligne;
    }).join("\n");
}

module.exports = { corrigerDescription };
