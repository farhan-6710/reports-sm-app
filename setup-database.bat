@echo off
echo ========================================
echo Database Setup for Social Media Reports
echo ========================================
echo.

REM Check if MySQL is available
where mysql >nul 2>&1
if %errorlevel% neq 0 (
    echo ERROR: MySQL is not installed or not in PATH
    echo Please install MySQL or add it to your PATH
    pause
    exit /b 1
)

echo Step 1: Checking MySQL connection...
echo.

REM Prompt for MySQL password
set /p MYSQL_PASSWORD="Enter MySQL root password (press Enter if no password): "

echo.
echo Step 2: Creating database and tables...
echo.

REM Run the SQL file
if "%MYSQL_PASSWORD%"=="" (
    mysql -u root < "%~dp0social_media_report\backend\setup_complete_database.sql"
) else (
    mysql -u root -p%MYSQL_PASSWORD% < "%~dp0social_media_report\backend\setup_complete_database.sql"
)

if %errorlevel% equ 0 (
    echo.
    echo ========================================
    echo SUCCESS! Database setup completed!
    echo ========================================
    echo.
    echo Database: social_media_reports
    echo Tables created:
    echo   - accounts (organic accounts)
    echo   - ad_accounts (ad accounts)
    echo   - reports
    echo   - notifications
    echo   - oauth_states
    echo   - users
    echo   - instagram_stories_archive
    echo   - follower_snapshots
    echo   - system_token
    echo.
) else (
    echo.
    echo ========================================
    echo ERROR: Database setup failed!
    echo ========================================
    echo.
    echo Please check:
    echo   1. MySQL is running
    echo   2. MySQL root password is correct
    echo   3. You have permission to create databases
    echo.
)

pause












