@echo off
setlocal
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start-game.ps1" %*
set "MYGO_EXIT=%ERRORLEVEL%"
if not "%MYGO_EXIT%"=="0" if not defined MYGO_NO_PAUSE pause
exit /b %MYGO_EXIT%
