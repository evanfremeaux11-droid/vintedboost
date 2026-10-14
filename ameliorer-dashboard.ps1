$ErrorActionPreference = 'Stop'
$path = Join-Path (Get-Location) 'index.html'

try {
    if (-not (Test-Path -LiteralPath $path)) { throw 'index.html introuvable. Ouvre PowerShell dans le dossier vinted boost.' }
    $html = [System.IO.File]::ReadAllText($path, [System.Text.Encoding]::UTF8)
    if ($html.Contains('id="dashboardScoreBar"')) {
        Write-Host 'Barres deja installees. Aucune modification.'
        exit 0
    }

    $scoreAncien = '<div class="vb-dashboard-value" id="dashboardScore">-- / 100</div>'
    $photosAncien = '<div class="vb-dashboard-value" id="dashboardPhotos">-- / 4</div>'
    $sectionAncre = '<section id="vintedDashboard"'
    $functionStart = 'function afficherTableauDeBord()'
    $functionEnd = '    dashboard.style.display = "block";'

    foreach ($needle in @($scoreAncien, $photosAncien, $sectionAncre, $functionStart, $functionEnd)) {
        if ($html.Split([string[]]@($needle), [System.StringSplitOptions]::None).Length -ne 2) {
            throw "Emplacement absent ou multiple : $needle. Aucune modification."
        }
    }

    $scoreNouveau = @'
<div class="vb-dashboard-value" id="dashboardScore">-- / 100</div>
<div class="vb-progress" role="progressbar" aria-label="Completude de l'annonce" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="dashboardScoreProgress">
    <div class="vb-progress-fill vb-score-fill" id="dashboardScoreBar"></div>
</div>
<p id="dashboardScoreMessage">Score de complétude.</p>
'@
    $photosNouveau = @'
<div class="vb-dashboard-value" id="dashboardPhotos">-- / 4</div>
<div class="vb-progress" role="progressbar" aria-label="Nombre de photos sur quatre" aria-valuemin="0" aria-valuemax="4" aria-valuenow="0" id="dashboardPhotosProgress">
    <div class="vb-progress-fill vb-photos-fill" id="dashboardPhotosBar"></div>
</div>
'@
    $css = @'
<style id="vb-dashboard-progress-style">
.vb-progress { width:100%; height:10px; background:#e5e7eb; border-radius:20px; overflow:hidden; margin:12px 0; }
.vb-progress-fill { height:100%; width:0%; border-radius:20px; transition:width .6s ease; }
.vb-score-fill { background:linear-gradient(90deg,#22c55e,#16a34a); }
.vb-photos-fill { background:linear-gradient(90deg,#60a5fa,#2563eb); }
</style>
'@
    $jsNouveau = @'
    const scoreBar = document.getElementById("dashboardScoreBar");
    const photosBar = document.getElementById("dashboardPhotosBar");
    const scoreMessage = document.getElementById("dashboardScoreMessage");
    const scoreProgress = document.getElementById("dashboardScoreProgress");
    const photosProgress = document.getElementById("dashboardPhotosProgress");
    const scoreValeur = scoreElement ? parseInt(scoreElement.textContent, 10) : NaN;

    if (scoreBar) {
        scoreBar.style.width = Number.isFinite(scoreValeur)
            ? Math.max(0, Math.min(100, scoreValeur)) + "%" : "0%";
    }
    if (scoreProgress) {
        scoreProgress.setAttribute("aria-valuenow", Number.isFinite(scoreValeur)
            ? String(Math.max(0, Math.min(100, scoreValeur))) : "0");
    }
    if (photosBar) {
        photosBar.style.width = Math.max(0, Math.min(100, nombrePhotos * 25)) + "%";
    }
    if (photosProgress) {
        photosProgress.setAttribute("aria-valuenow", String(Math.max(0, Math.min(4, nombrePhotos))));
    }
    if (scoreMessage) {
        scoreMessage.textContent = !Number.isFinite(scoreValeur)
            ? "Score indisponible."
            : scoreValeur >= 85 ? "Informations bien complétées."
            : scoreValeur >= 60 ? "Bonne base, quelques informations à ajouter."
            : "Complète davantage les informations de l'article.";
    }
'@

    $newHtml = $html.Replace($scoreAncien, $scoreNouveau)
    $newHtml = $newHtml.Replace($photosAncien, $photosNouveau)
    $newHtml = $newHtml.Replace($sectionAncre, $css + "`r`n" + $sectionAncre)
    $newHtml = $newHtml.Replace($functionEnd, $jsNouveau + "`r`n" + $functionEnd)

    $backup = Join-Path (Get-Location) 'index-avant-barres-dashboard.html'
    Copy-Item -LiteralPath $path -Destination $backup -Force
    [System.IO.File]::WriteAllText($path, $newHtml, (New-Object System.Text.UTF8Encoding($false)))
    Write-Host 'OK - Barres de progression installees.'
    Write-Host 'Sauvegarde : index-avant-barres-dashboard.html'
} catch {
    Write-Host ('ERREUR - ' + $_.Exception.Message)
    exit 1
}
