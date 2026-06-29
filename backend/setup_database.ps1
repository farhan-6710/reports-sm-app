# PowerShell script to set up the database
# This script helps set up the MySQL database for the Social Media Report project

Write-Host "=== Social Media Reports Database Setup ===" -ForegroundColor Cyan
Write-Host ""

# Check if MySQL is accessible
Write-Host "Checking MySQL connection..." -ForegroundColor Yellow
$mysqlTest = Test-NetConnection -ComputerName 127.0.0.1 -Port 3306 -InformationLevel Quiet

if (-not $mysqlTest) {
    Write-Host "ERROR: MySQL is not running on port 3306" -ForegroundColor Red
    Write-Host "Please start MySQL service first." -ForegroundColor Yellow
    exit 1
}

Write-Host "MySQL is running on port 3306" -ForegroundColor Green
Write-Host ""

# Find MySQL executable
$mysqlPath = $null
$possiblePaths = @(
    "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe",
    "C:\Program Files\MySQL\MySQL Server 8.4\bin\mysql.exe",
    "C:\xampp\mysql\bin\mysql.exe",
    "C:\wamp64\bin\mysql\mysql8.0.xx\bin\mysql.exe",
    "C:\laragon\bin\mysql\mysql-8.0.xx\bin\mysql.exe"
)

Write-Host "Looking for MySQL executable..." -ForegroundColor Yellow
foreach ($path in $possiblePaths) {
    if (Test-Path $path) {
        $mysqlPath = $path
        Write-Host "Found MySQL at: $mysqlPath" -ForegroundColor Green
        break
    }
}

# Also check if mysql is in PATH
if (-not $mysqlPath) {
    try {
        $mysqlCheck = Get-Command mysql -ErrorAction Stop
        $mysqlPath = $mysqlCheck.Source
        Write-Host "Found MySQL in PATH: $mysqlPath" -ForegroundColor Green
    } catch {
        Write-Host "MySQL not found in PATH" -ForegroundColor Yellow
    }
}

if (-not $mysqlPath) {
    Write-Host ""
    Write-Host "ERROR: Could not find MySQL executable" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please run the SQL file manually:" -ForegroundColor Yellow
    Write-Host "1. Open MySQL Workbench or phpMyAdmin" -ForegroundColor Yellow
    Write-Host "2. Connect with:" -ForegroundColor Yellow
    Write-Host "   - Host: 127.0.0.1" -ForegroundColor White
    Write-Host "   - Username: root" -ForegroundColor White
    Write-Host "   - Password: 123" -ForegroundColor White
    Write-Host "3. Run the SQL file: setup_complete_database.sql" -ForegroundColor Yellow
    Write-Host ""
    exit 1
}

# Get the script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$sqlFile = Join-Path $scriptDir "setup_complete_database.sql"

if (-not (Test-Path $sqlFile)) {
    Write-Host "ERROR: SQL file not found: $sqlFile" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Setting up database..." -ForegroundColor Yellow
Write-Host "SQL File: $sqlFile" -ForegroundColor Gray
Write-Host ""

# Run the SQL file
$env:MYSQL_PWD = "123"
& $mysqlPath -u root -p123 < $sqlFile

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "SUCCESS: Database setup completed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "You can now test the backend API:" -ForegroundColor Cyan
    Write-Host "  http://127.0.0.1:8000/api/accounts.php" -ForegroundColor White
} else {
    Write-Host ""
    Write-Host "ERROR: Database setup failed (Exit code: $LASTEXITCODE)" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please check:" -ForegroundColor Yellow
    Write-Host "1. MySQL credentials are correct (root/123)" -ForegroundColor Yellow
    Write-Host "2. MySQL user has CREATE DATABASE privileges" -ForegroundColor Yellow
    Write-Host "3. Try running the SQL file manually in MySQL Workbench" -ForegroundColor Yellow
}
