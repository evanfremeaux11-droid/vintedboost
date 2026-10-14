const { analyserDescription } = require("./description-corrector");

function proposerCorrection(description) {
    const analyse = analyserDescription(description);

    if (!analyse.repetitionDetectee) {
        return {
            correctionNecessaire: false,
            descriptionCorrigee: description
        };
    }

    return {
        correctionNecessaire: true,
        repetitions: analyse.repetitions,
        descriptionCorrigee: description,
        correctionAutomatiqueAppliquee: false
    };
}

module.exports = { proposerCorrection };
