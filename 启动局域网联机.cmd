@echo off
chcp 65001 >nul
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 请先安装 Node.js LTS，然后再次打开此文件。
  pause
  exit /b 1
)
echo 保持此窗口开启。浏览器访问下方地址；另一台电脑使用同一局域网地址。
node server/lan-server.cjs
pause
