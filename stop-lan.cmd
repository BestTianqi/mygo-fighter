@echo off
setlocal
chcp 65001 >nul
powershell.exe -NoLogo -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\stop-lan.ps1" %*
if errorlevel 1 (
  echo.
  pause
  exit /b 1
)
timeout /t 2 /nobreak >nul 2>nul
exit /b 0
