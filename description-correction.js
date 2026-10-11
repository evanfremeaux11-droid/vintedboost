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

        const premium = ligne.match(
            /^(.*?), dot[e\u00e9] d'un col montant et de manches longues\.$/i
        );

        if (
            premium &&
            /col montant/i.test(details) &&
            /manches longues/i.test(details)
        ) {
            return premium[1] + ".";
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
