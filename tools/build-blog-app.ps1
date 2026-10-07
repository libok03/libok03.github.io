$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
$pythonExe = Join-Path $projectRoot '.tools/app-env/Scripts/python.exe'
if (-not (Test-Path -LiteralPath $pythonExe)) { throw 'App build environment is missing.' }
$appOutput = [IO.Path]::GetFullPath((Join-Path $projectRoot '.tools/apps/current'))
if (-not $appOutput.StartsWith($projectRoot + '\.tools\apps\', [StringComparison]::OrdinalIgnoreCase)) { throw 'Invalid app output path.' }
& $pythonExe -m PyInstaller --noconfirm --onedir --windowed --name PaperBlog --distpath $appOutput --workpath "$projectRoot/.tools/app-build" --specpath "$projectRoot/.tools" --add-data "$PSScriptRoot/blog-app/ui;ui" --collect-all webview --hidden-import yaml "$PSScriptRoot/blog-app/app.py"
if ($LASTEXITCODE -ne 0) { throw 'App build failed.' }
$appExe = Join-Path $appOutput 'PaperBlog/PaperBlog.exe'
$shortcutName = -join @([char]0xB17C, [char]0xBB38, ' ', [char]0xBE14, [char]0xB85C, [char]0xADF8, '.lnk')
$shortcutPath = Join-Path ([Environment]::GetFolderPath('Desktop')) $shortcutName
$shortcutShell = New-Object -ComObject WScript.Shell
if (Test-Path -LiteralPath $shortcutPath) {
  $existing = $shortcutShell.CreateShortcut($shortcutPath)
  if ($existing.TargetPath -and -not $existing.TargetPath.StartsWith($projectRoot + '\.tools\apps\', [StringComparison]::OrdinalIgnoreCase)) { $shortcutPath = Join-Path ([Environment]::GetFolderPath('Desktop')) 'Paper Blog.lnk' }
}
$shortcut = $shortcutShell.CreateShortcut($shortcutPath)
$shortcut.TargetPath = $appExe
$shortcut.Arguments = '--project "' + $projectRoot + '"'
$shortcut.WorkingDirectory = $projectRoot
$shortcut.Description = 'Paper review writing and live preview'
$shortcut.Save()
Write-Host "App ready: $appExe"
Write-Host "Desktop shortcut: $shortcutPath"
