@echo off
setlocal
for %%D in ("%~dp0..") do set "PROJECT=%%~fD"
if /I "%~1"=="--once" goto sync
call :copy
for /L %%N in (1,1,30) do (
  tasklist /FI "IMAGENAME eq PaperBlog.exe" /NH 2>nul | find /I "PaperBlog.exe" >nul
  if not errorlevel 1 goto watching
  timeout /t 1 /nobreak >nul 2>nul
)
exit /b 0
:watching
call :copy
tasklist /FI "IMAGENAME eq PaperBlog.exe" /NH 2>nul | find /I "PaperBlog.exe" >nul
if errorlevel 1 exit /b 0
timeout /t 1 /nobreak >nul 2>nul
goto watching
:sync
call :copy
exit /b 0
:copy
robocopy "%PROJECT%\posts" "%PROJECT%\_preview\posts" *.png *.jpg *.jpeg *.gif *.webp *.svg /S /XJ /R:1 /W:0 /NFL /NDL /NJH /NJS /NP >nul
exit /b 0
