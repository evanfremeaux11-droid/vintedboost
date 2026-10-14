$ErrorActionPreference = 'Stop'
try {
    $folder = Split-Path -Parent $MyInvocation.MyCommand.Path
    $source = Join-Path $folder 'index-vintedboost-dashboard-v2.html'
    $target = Join-Path (Get-Location).Path 'index.html'
    $expected = '5181c9681f4b594b529a952449cb4f4715ef5daafa8106bdf13454e51df3054a'
    if (!(Test-Path $source)) { throw 'Fichier de mise a jour absent du dossier.' }
    if (!(Test-Path $target)) { throw 'index.html introuvable : lance le script depuis le dossier vinted boost.' }
    $actual = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -ne $expected) { throw 'index.html a change depuis le fichier envoye. Aucune modification effectuee. Envoie-moi le nouvel index.html.' }
    $backup = Join-Path (Get-Location).Path ('index-avant-dashboard-v2-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.html')
    Copy-Item -LiteralPath $target -Destination $backup -ErrorAction Stop
    Copy-Item -LiteralPath $source -Destination $target -ErrorAction Stop
    Write-Host 'OK - Tableau de bord V2 installe localement.'
    Write-Host ('Sauvegarde : ' + $backup)
    Write-Host 'Aucune publication GitHub/Render effectuee.'
} catch {
    Write-Host ('ERREUR : ' + $_.Exception.Message)
    exit 1
}
