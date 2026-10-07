$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$quartoPath = Join-Path $projectRoot '.tools/bin/quarto.exe'
if (-not (Test-Path -LiteralPath $quartoPath)) { & "$PSScriptRoot/setup-quarto.ps1" | Out-Host }
Push-Location $projectRoot
try { & $quartoPath render --profile publish; exit $LASTEXITCODE }
finally { Pop-Location }
