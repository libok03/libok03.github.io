param([switch]$NoBrowser)
$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$quartoPath = Join-Path $projectRoot '.tools/bin/quarto.exe'
if (-not (Test-Path -LiteralPath $quartoPath)) { & "$PSScriptRoot/setup-quarto.ps1" | Out-Host }
$existingPreview = $null
try {
  $existingPreview = Invoke-WebRequest -UseBasicParsing -Uri 'http://127.0.0.1:4200/' -TimeoutSec 2
} catch { }
if ($existingPreview -and $existingPreview.Content.Contains('libok03 / research notes')) {
  Write-Host 'Preview is already running: http://127.0.0.1:4200/'
  if (-not $NoBrowser) { Start-Process 'http://127.0.0.1:4200/' }
  exit 0
}
Push-Location $projectRoot
try {
  $previewArgs = @('preview', '--render', 'all', '--profile', 'preview', '--host', '127.0.0.1', '--port', '4200')
  if ($NoBrowser) { $previewArgs += '--no-browser' }
  & $quartoPath @previewArgs
  exit $LASTEXITCODE
} finally { Pop-Location }
