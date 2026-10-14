$ErrorActionPreference = 'Stop'
try {
    $folder = Split-Path -Parent $MyInvocation.MyCommand.Path
    $source = Join-Path $folder 'index-vintedboost-dashboard-v3.html'
    $target = Join-Path (Get-Location).Path 'index.html'
    $expected = '9a7a3ee786f02f7422475b3648fb227676f290aa9be11cd962a99b653602c2d7'
    if (!(Test-Path -LiteralPath $source)) { throw 'Fichier V3 absent du dossier.' }
    if (!(Test-Path -LiteralPath $target)) { throw 'index.html introuvable : ouvre PowerShell dans le dossier vinted boost.' }
    $actual = (Get-FileHash -LiteralPath $target -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actual -ne $expected) { throw 'index.html ne correspond pas a la V2 fournie. Aucune modification effectuee. Envoie le fichier index.html actuel.' }
    $backup = Join-Path (Get-Location).Path ('index-avant-dashboard-v3-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.html')
    Copy-Item -LiteralPath $target -Destination $backup -ErrorAction Stop
    Copy-Item -LiteralPath $source -Destination $target -ErrorAction Stop
    Write-Host 'OK - Tableau de bord V3 installe localement.'
    Write-Host ('Sauvegarde : ' + $backup)
    Write-Host 'Aucune publication GitHub/Render effectuee.'
} catch {
    Write-Host ('ERREUR : ' + $_.Exception.Message)
    exit 1
}
