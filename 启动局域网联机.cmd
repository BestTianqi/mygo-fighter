@echo off
setlocal
cd /d "%~dp0"
rem JLine needs a writable directory to extract its Windows console DLL.
set "MYGO_JAVA_TMP=%CD%\output\java-tmp"
if not exist "%MYGO_JAVA_TMP%" mkdir "%MYGO_JAVA_TMP%"
if not exist "%MYGO_JAVA_TMP%" goto failed
set "TEMP=%MYGO_JAVA_TMP%"
set "TMP=%MYGO_JAVA_TMP%"
where node >nul 2>nul
if errorlevel 1 (
  echo Install Node.js 22 or 24 LTS, Java 21+, and sbt before running this launcher.
  pause
  exit /b 1
)
if not exist node_modules (
  call npm ci
  if errorlevel 1 goto failed
)
rem Reuse the optional portable toolchain downloaded for local verification.
set "MYGO_TOOLCHAIN=%CD%\output\toolchain"
set "MYGO_PORTABLE_JAVA="
for /d %%J in ("%MYGO_TOOLCHAIN%\jdk-*") do if exist "%%~fJ\bin\java.exe" set "MYGO_PORTABLE_JAVA=%%~fJ\bin\java.exe"
if defined MYGO_PORTABLE_JAVA if exist "%MYGO_TOOLCHAIN%\sbt-launch.jar" goto portable
call npm run lan
if errorlevel 1 goto failed
pause
exit /b 0
:portable
call npm run build
if errorlevel 1 goto failed
set "COURSIER_CACHE=%MYGO_TOOLCHAIN%\coursier"
set "WEB_ROOT=%CD%\frontend\dist"
echo.
echo Open http://localhost:8080 on this computer.
echo On the other device, use this computer's Wi-Fi IPv4 address with port 8080.
echo Keep this window open while playing.
echo.
ipconfig | findstr /i "IPv4"
cd backend
"%MYGO_PORTABLE_JAVA%" "-Djava.io.tmpdir=%MYGO_JAVA_TMP%" "-Dsbt.boot.directory=%MYGO_TOOLCHAIN%\sbt-boot" "-Dsbt.global.base=%MYGO_TOOLCHAIN%\sbt-global" "-Dsbt.repository.config=%MYGO_TOOLCHAIN%\repositories" -Dsbt.override.build.repos=true -jar "%MYGO_TOOLCHAIN%\sbt-launch.jar" run
if errorlevel 1 goto failed
pause
exit /b 0
:failed
echo The server could not start. Read the error above.
pause
exit /b 1
