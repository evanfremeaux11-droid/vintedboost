$ErrorActionPreference = 'Stop'
if ((git branch --show-current).Trim() -ne 'v2-developpement') { throw 'Mauvaise branche Git' }
node --check '.\server-v2-quotas.js'
if ($LASTEXITCODE -ne 0) { throw 'Syntaxe JS invalide' }
$source = Get-Content '.\server-v2-quotas.js' -Raw -Encoding UTF8
foreach ($name in @('V2_QUOTA_RESERVATIONS_ENABLED','reserve_generation_v2','complete_generation_v2','refund_generation_v2','use_generation')) {
 if (-not $source.Contains($name)) { throw "Code manquant : $name" }
}
if (Select-String '.\.env' -Pattern '^V2_QUOTA_RESERVATIONS_ENABLED=true' -Quiet -ErrorAction SilentlyContinue) {
 throw 'Drapeau V2 deja active : desactiver avant les tests locaux'
}
Write-Host 'OK : branche V2, syntaxe et points integration' -ForegroundColor Green
Write-Host 'Tests statiques seulement : SQL, concurrence et remboursements reels non verifies.' -ForegroundColor Yellow
Write-Host 'Aucun appel Supabase et aucun quota consomme.' -ForegroundColor Green
