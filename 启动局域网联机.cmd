@echo off
setlocal
cd /d "%~dp0"
if not defined PORT set "PORT=8765"
set "MYGO_NODE="
"%SystemRoot%\System32\where.exe" node.exe >nul 2>nul
if not errorlevel 1 set "MYGO_NODE=node.exe"
if not defined MYGO_NODE if exist "%ProgramFiles%\nodejs\node.exe" set "MYGO_NODE=%ProgramFiles%\nodejs\node.exe"
if not defined MYGO_NODE if exist "%LOCALAPPDATA%\Programs\nodejs\node.exe" set "MYGO_NODE=%LOCALAPPDATA%\Programs\nodejs\node.exe"
if not defined MYGO_NODE (
  echo Node.js was not found. Install Node.js LTS from https://nodejs.org/
  echo Then close this window and reopen this launcher.
  pause
  exit /b 1
)
"%MYGO_NODE%" -e "if (Number(process.versions.node.split('.')[0]) < 18) process.exit(1)"
if errorlevel 1 (
  echo Node.js 18 or newer is required. Please install Node.js LTS.
  pause
  exit /b 1
)

rem --- Already running? Then do not start a second server (that causes EADDRINUSE). ---
"%MYGO_NODE%" -e "fetch('http://127.0.0.1:%PORT%/api/health',{signal:AbortSignal.timeout(1500)}).then(function(r){return r.json()}).then(function(j){process.exit(j && j.app==='mygo-lan' ? 0 : 1)}).catch(function(){process.exit(1)})"
if not errorlevel 1 goto alreadyrunning

echo Keep this window open while playing.
echo Open one of the addresses below in your browser.
echo The second computer must use the host's LAN address, not localhost.
"%MYGO_NODE%" "%~dp0server\lan-server.cjs"
if errorlevel 1 echo The server stopped. Check the error above, including whether the port is already in use.
pause
exit /b 0

:alreadyrunning
echo.
echo A MyGO LAN server is ALREADY running on port %PORT%.
echo Do not start a second copy. Close this window and use the server window that is already open.
echo.
"%MYGO_NODE%" -e "const os=require('os');const a=[];for(const l of Object.values(os.networkInterfaces()))for(const x of l||[])if(x.family==='IPv4'&&!x.internal&&!/^(169\.254\.|198\.1[89]\.)/.test(x.address))a.push(x.address);console.log('  This computer:  http://localhost:%PORT%');for(const ip of a)console.log('  Other computer: http://'+ip+':%PORT%')"
echo.
echo If you cannot find the running server window, end the leftover node.exe process in Task Manager, then run this launcher again.
start "" "http://localhost:%PORT%"
pause
exit /b 0
