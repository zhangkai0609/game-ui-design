@echo off
cd /d "%~dp0"
start "" "http://localhost:5178/mobile-preview.html"
node server.mjs
pause
