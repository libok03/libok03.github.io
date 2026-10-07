$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$version = '1.10.18'
$toolRoot = Join-Path $projectRoot '.tools'
$quartoPath = Join-Path $toolRoot 'bin/quarto.exe'
if (Test-Path -LiteralPath $quartoPath) { Write-Output $quartoPath; exit 0 }
New-Item -ItemType Directory -Path $toolRoot -Force | Out-Null
$assetName = "quarto-$version-win.zip"
$archivePath = Join-Path $toolRoot $assetName
$releaseUrl = "https://github.com/quarto-dev/quarto-cli/releases/download/v$version"
Write-Host "Downloading Quarto $version..."
$ProgressPreference = 'SilentlyContinue'
if (-not (Test-Path -LiteralPath $archivePath)) {
  Invoke-WebRequest -UseBasicParsing -Uri "$releaseUrl/$assetName" -OutFile $archivePath
}
$checksums = (Invoke-WebRequest -UseBasicParsing -Uri "$releaseUrl/quarto-$version-checksums.txt").Content
if ($checksums -is [byte[]]) { $checksums = [Text.Encoding]::UTF8.GetString($checksums) }
$checksumLine = ($checksums -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -match [regex]::Escape($assetName) + '$' } | Select-Object -First 1)
if (-not $checksumLine) { throw 'Checksum not found.' }
$expectedHash = ($checksumLine -split '\s+')[0]
$actualHash = (Get-FileHash -LiteralPath $archivePath -Algorithm SHA256).Hash
if ($actualHash -ne $expectedHash) { throw 'Quarto archive checksum mismatch.' }
Write-Host 'Checksum verified. Extracting...'
Expand-Archive -LiteralPath $archivePath -DestinationPath $toolRoot -Force
if (-not (Test-Path -LiteralPath $quartoPath)) { throw "Missing executable: $quartoPath" }
Write-Output $quartoPath
