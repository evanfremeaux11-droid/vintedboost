const assert = require("node:assert/strict");

function creerQuota(limite = 5) {
    return {
        utilise: 0,
        limite,
        reservations: new Map()
    };
}

function reserver(quota, id) {
    if (quota.utilise >= quota.limite) return false;
    quota.utilise++;
    quota.reservations.set(id, "pending");
    return true;
}

function terminer(quota, id) {
    if (quota.reservations.get(id) !== "pending") return false;
    quota.reservations.set(id, "completed");
    return true;
}

function rembourser(quota, id) {
    if (quota.reservations.get(id) !== "pending") return false;
    quota.reservations.set(id, "refunded");
    quota.utilise--;
    return true;
}

const q = creerQuota();

assert.equal(reserver(q, "test1"), true);
assert.equal(q.utilise, 1);

assert.equal(rembourser(q, "test1"), true);
assert.equal(q.utilise, 0);

assert.equal(rembourser(q, "test1"), false);
assert.equal(q.utilise, 0);

assert.equal(reserver(q, "test2"), true);
assert.equal(terminer(q, "test2"), true);
assert.equal(rembourser(q, "test2"), false);
assert.equal(q.utilise, 1);

console.log("OK : reservation");
console.log("OK : remboursement apres erreur");
console.log("OK : double remboursement bloque");
console.log("OK : generation reussie conservee");
console.log("Tests locaux termines.");
