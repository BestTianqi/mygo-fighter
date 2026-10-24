@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22 or 24 LTS before running this launcher.
  pause
  exit /b 1
)
if not exist node_modules (
  call npm ci
  if errorlevel 1 goto failed
)
call npm run lan
if errorlevel 1 goto failed
echo.
echo The launcher has finished. Any existing backend remains in its original window.
pause
exit /b 0
:failed
echo.
echo The backend could not start. Read the error above.
pause
exit /b 1
