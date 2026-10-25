@echo off
call "%~dp0stop-lan.cmd" %*
exit /b %errorlevel%
