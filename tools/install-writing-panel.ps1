$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$packageSource = Join-Path $PSScriptRoot 'writing-panel'
$toolsPath = Join-Path $projectRoot '.tools'
New-Item -ItemType Directory -Path $toolsPath -Force | Out-Null
$packageFile = Join-Path $toolsPath 'paper-writing-panel.vsix'
Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem
$stream = [IO.File]::Open($packageFile, [IO.FileMode]::Create)
$zip = New-Object IO.Compression.ZipArchive($stream, [IO.Compression.ZipArchiveMode]::Create)
try {
  Get-ChildItem -LiteralPath $packageSource -File -Recurse | Where-Object { $_.FullName -notmatch '[\\/]test[\\/]' } | ForEach-Object {
    $entryName = $_.FullName.Substring($packageSource.Length + 1).Replace('\','/')
    [IO.Compression.ZipFileExtensions]::CreateEntryFromFile($zip, $_.FullName, $entryName) | Out-Null
  }
} finally { $zip.Dispose(); $stream.Dispose() }
& code --install-extension $packageFile --force
if ($LASTEXITCODE -ne 0) { throw 'Writing panel installation failed.' }
Write-Host 'Writing panel installed. Reload the VS Code window to activate it.'

