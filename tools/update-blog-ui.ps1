$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$bundleRoot = [IO.Path]::GetFullPath((Join-Path $projectRoot '.tools/apps/current/PaperBlog'))
if (-not $bundleRoot.StartsWith($projectRoot + '\.tools\apps\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid application directory.' }
$nativeExe = Join-Path $bundleRoot 'PaperBlog.exe'
if (-not (Test-Path -LiteralPath $nativeExe)) { throw 'Existing app not found.' }
$originalHash = (Get-FileHash -LiteralPath $nativeExe -Algorithm SHA256).Hash
$sourceUi = Join-Path $PSScriptRoot 'blog-app/ui'
$targetUi = Join-Path $bundleRoot '_internal/ui'
$backupUi = Join-Path $projectRoot ('.tools/ui-backup-' + [guid]::NewGuid().ToString('N'))
Copy-Item -LiteralPath $targetUi -Destination $backupUi -Recurse
Copy-Item -Path (Join-Path $sourceUi '*') -Destination $targetUi -Recurse -Force
if ((Get-FileHash -LiteralPath $nativeExe -Algorithm SHA256).Hash -ne $originalHash) { throw 'Unexpected native executable change.' }
Write-Host 'Web interface updated. Native executable unchanged.'
Write-Host "Previous interface saved at $backupUi"
