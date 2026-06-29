@echo off
echo ========================================
echo Checking Backend Server Status
echo ========================================
echo.

curl -s http://localhost:8000/api/accounts.php >nul 2>&1
if %errorlevel% equ 0 (
    echo [OK] Backend server is running on port 8000
    echo.
    echo Testing API endpoint...
    curl -s http://localhost:8000/api/accounts.php
    echo.
) else (
    echo [ERROR] Backend server is NOT running on port 8000
    echo.
    echo To start the server, run: start-backend.bat
    echo Or manually run:
    echo   cd backend
    echo   php -S localhost:8000 router.php
    echo.
)

pause












