@echo off
echo Starting Carcleaning010 Website...
echo.
cd /d "%~dp0"
echo Opening website at http://localhost:8000
echo Press Ctrl+C to stop the server
echo.
start http://localhost:8000
python -m http.server 8000
pause