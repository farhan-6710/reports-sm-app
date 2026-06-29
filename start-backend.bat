@echo off
echo ========================================
echo Starting Backend Server
echo ========================================
echo.
echo This will start the PHP server on port 8000
echo Press Ctrl+C to stop the server
echo.
echo.

cd /d "%~dp0backend"
if not exist "router.php" (
    echo ERROR: router.php not found in backend directory!
    echo Please make sure you're running this from the project root.
    pause
    exit /b 1
)

echo Starting PHP server on http://localhost:8000
echo.
php -S localhost:8000 router.php

pause












