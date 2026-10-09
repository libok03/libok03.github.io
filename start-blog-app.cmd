@echo off
cd /d "%~dp0"
powershell.exe -NoProfile -Command "Start-Process -FilePath cmd.exe -ArgumentList '/d /c ""%~dp0tools\sync-preview-assets.cmd""' -WindowStyle Hidden"
if exist "%~dp0.tools\app-env\Scripts\pythonw.exe" (
  start "" /B "%~dp0.tools\app-env\Scripts\pythonw.exe" "%~dp0tools\connect-github.py" --launch
  exit /b 0
)
if exist "%~dp0.tools\apps\fast-preview\PaperBlog\.verified" (
  start "" "%~dp0.tools\apps\fast-preview\PaperBlog\PaperBlog.exe" --project "%~dp0."
  exit /b 0
)
if not exist "%~dp0.tools\apps\current\PaperBlog\PaperBlog.exe" (
  echo Please build the blog app first.
  pause
  exit /b 1
)
start "" "%~dp0.tools\apps\current\PaperBlog\PaperBlog.exe" --project "%~dp0."
