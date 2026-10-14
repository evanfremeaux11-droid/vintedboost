$path = ".\index.html"

if (!(Test-Path $path)) {
    Write-Host "ERREUR : index.html introuvable."
    exit
}

$html = [System.IO.File]::ReadAllText($path)

if ($html.Contains("function afficherTableauDeBord()")) {
    Write-Host "Tableau de bord deja connecte."
    exit
}

if (!$html.Contains('id="dashboardScore"')) {
    Write-Host "ERREUR : design du tableau de bord absent."
    exit
}

$ancre = '    result.scrollIntoView({'
if ($html.Split([string[]]@($ancre), [System.StringSplitOptions]::None).Length -ne 2) {
    Write-Host "ERREUR : emplacement de connexion introuvable ou multiple."
    exit
}

$fonction = @'

function afficherTableauDeBord() {

    const dashboard = document.getElementById("vintedDashboard");
    if (!dashboard) return;

    const scoreElement = document.getElementById("scoreText");
    const scoreDashboard = document.getElementById("dashboardScore");

    if (scoreElement && scoreDashboard) {
        const score = parseInt(scoreElement.textContent, 10);
        scoreDashboard.textContent =
            Number.isFinite(score) ? score + " / 100" : "Indisponible";
    }

    const nombrePhotos = photosBase64.length;

    document.getElementById("dashboardPhotos").textContent =
        nombrePhotos + " / 4";

    let conseilPhoto = "";

    if (nombrePhotos === 0) {
        conseilPhoto = "Ajoute des photos de ton article.";
    } else if (nombrePhotos === 1) {
        conseilPhoto = "Ajoute une photo de dos et des détails.";
    } else if (nombrePhotos <= 3) {
        conseilPhoto = "Pense à montrer les étiquettes et les éventuels défauts.";
    } else {
        conseilPhoto = "Vérifie la netteté, la luminosité et la variété des angles.";
    }

    document.getElementById("dashboardPhotoConseil").textContent =
        conseilPhoto;

    const champs = [
        ["article", "le type d'article"],
        ["marque", "la marque"],
        ["categorie", "la catégorie"],
        ["taille", "la taille"],
        ["couleur", "la couleur"],
        ["etat", "l'état"],
        ["details", "les détails de l'article"]
    ];

    const manquants = champs
        .filter(([id]) => !value(id))
        .map(([, label]) => label);

    document.getElementById("dashboardConseils").textContent =
        manquants.length
            ? "À compléter si applicable : " + manquants.join(", ") + "."
            : "Les principales informations sont renseignées. Vérifie leur exactitude avant publication.";

    dashboard.style.display = "block";
}

'@

$remplacement = $fonction + "`r`n    afficherTableauDeBord();`r`n" + $ancre

Copy-Item $path ".\index-avant-activation-dashboard.html" -Force

$html = $html.Replace($ancre, $remplacement)

[System.IO.File]::WriteAllText(
    $path,
    $html,
    [System.Text.UTF8Encoding]::new($false)
)

Write-Host "OK - Tableau de bord connecte avec succes."