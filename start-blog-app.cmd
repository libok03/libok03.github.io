@echo off
cd /d "%~dp0"
if not exist "%~dp0.tools\apps\current\PaperBlog\PaperBlog.exe" (
  echo Please build the blog app first.
  pause
  exit /b 1
)
start "" "%~dp0.tools\apps\current\PaperBlog\PaperBlog.exe" --project "%~dp0."
