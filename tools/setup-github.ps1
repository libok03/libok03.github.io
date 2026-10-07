$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$toolRoot = Join-Path $projectRoot '.tools/github'
$ghPath = Join-Path $toolRoot 'bin/gh.exe'
if (Test-Path -LiteralPath $ghPath) { Write-Output $ghPath; exit 0 }
$version = '2.102.0'
$asset = "gh_${version}_windows_amd64.zip"
New-Item -ItemType Directory -Path $toolRoot -Force | Out-Null
$archive = Join-Path $toolRoot $asset
$release = "https://github.com/cli/cli/releases/download/v$version"
$ProgressPreference = 'SilentlyContinue'
if (-not (Test-Path -LiteralPath $archive)) { Invoke-WebRequest -UseBasicParsing -Uri "$release/$asset" -OutFile $archive }
$checksums = (Invoke-WebRequest -UseBasicParsing -Uri "$release/gh_${version}_checksums.txt").Content
if ($checksums -is [byte[]]) { $checksums = [Text.Encoding]::UTF8.GetString($checksums) }
$line = $checksums -split "`n" | ForEach-Object { $_.Trim() } | Where-Object { $_ -match [regex]::Escape($asset) + '$' } | Select-Object -First 1
if (-not $line) { throw 'GitHub CLI checksum not found.' }
if ((Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash -ne ($line -split '\s+')[0]) { throw 'GitHub CLI checksum mismatch.' }
Expand-Archive -LiteralPath $archive -DestinationPath $toolRoot -Force
if (-not (Test-Path -LiteralPath $ghPath)) { throw 'GitHub CLI executable not found.' }
Write-Output $ghPath

