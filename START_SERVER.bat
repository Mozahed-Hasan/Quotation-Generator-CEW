@echo off
title Chowdhury Engineering Works - Local Portal Server
echo ========================================================
echo   Starting Chowdhury Engineering Works Management Portal
echo ========================================================
echo.
if not exist "node_modules\" (
    echo [Info] node_modules not found. Running npm install...
    call npm install
    if errorlevel 1 (
        echo.
        echo [Error] npm install failed! Please make sure Node.js is installed on this PC.
        echo Download Node.js from: https://nodejs.org
        pause
        exit /b
    )
)

echo.
echo [Info] Starting dev server...
echo [Tip] Once started, open http://localhost:3000 in your browser.
echo [Tip] To stop the server, close this window or press Ctrl+C.
echo.
call npm run dev
pause
