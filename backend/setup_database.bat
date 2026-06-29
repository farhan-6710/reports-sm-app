@echo off
echo Setting up Social Media Reports Database...
echo.
echo Please make sure MySQL is running and you have the correct credentials.
echo.

REM Try common MySQL paths on Windows
set MYSQL_PATH=
if exist "C:\xampp\mysql\bin\mysql.exe" set MYSQL_PATH=C:\xampp\mysql\bin\mysql.exe
if exist "C:\wamp64\bin\mysql\mysql8.0.xx\bin\mysql.exe" set MYSQL_PATH=C:\wamp64\bin\mysql\mysql8.0.xx\bin\mysql.exe
if exist "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" set MYSQL_PATH=C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe
if exist "C:\Program Files (x86)\MySQL\MySQL Server 8.0\bin\mysql.exe" set MYSQL_PATH=C:\Program Files (x86)\MySQL\MySQL Server 8.0\bin\mysql.exe

if "%MYSQL_PATH%"=="" (
    echo MySQL not found in common locations.
    echo Please run this command manually:
    echo mysql -u root -p ^< schema.sql
    echo.
    echo Or update this script with your MySQL path.
    pause
    exit /b 1
)

echo Found MySQL at: %MYSQL_PATH%
echo.
echo Importing database schema...
"%MYSQL_PATH%" -u root -p < schema.sql

if %ERRORLEVEL% EQU 0 (
    echo.
    echo Database setup completed successfully!
) else (
    echo.
    echo Database setup failed. Please check your MySQL credentials.
    echo Default credentials: username=root, password=(empty)
)

pause




















