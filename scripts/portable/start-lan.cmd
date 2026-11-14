@echo off
setlocal
call "%~dp0start-game.cmd" -Lan
exit /b %ERRORLEVEL%
