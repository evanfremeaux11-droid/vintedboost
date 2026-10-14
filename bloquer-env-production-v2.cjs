const dotenv = require("dotenv");

dotenv.config = function () {
    return { parsed: {} };
};

console.log("Protection V2 : chargement automatique .env bloque.");