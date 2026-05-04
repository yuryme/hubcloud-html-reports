@echo off
setlocal

cd /d "%~dp0"

if "%PORT%"=="" set "PORT=8010"

echo Starting HtmlForms dev server on port %PORT%...
echo.
echo Open:
echo http://127.0.0.1:%PORT%/report-builder/index.html
echo.

node .\dev-server.js

echo.
echo Server stopped. If there was an error, check the message above.
pause
