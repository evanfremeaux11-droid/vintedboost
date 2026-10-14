function analyserDescription(description) {
    const texte = String(description || "");

    const lignes = texte
        .split(/\r?\n/)
        .map(ligne => ligne.trim())
        .filter(Boolean);

    const introduction = lignes
        .filter(ligne => !/^[📏🎨✨🧵]/u.test(ligne))
        .join(" ")
        .toLowerCase();

    const details = lignes
        .filter(ligne => ligne.startsWith("🧵"))
        .join(" ")
        .toLowerCase();

    const caracteristiques = [
        "col montant",
        "manches longues",
        "badge logo amovible",
        "fermeture zippee"
    ];

    const repetitions = caracteristiques.filter(
        element =>
            introduction.includes(element) &&
            details.includes(element)
    );

    return {
        repetitions,
        repetitionDetectee: repetitions.length > 0,
        descriptionOriginale: texte
    };
}

module.exports = { analyserDescription };
