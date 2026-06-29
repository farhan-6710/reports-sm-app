# Quick Status Check
Write-Host "`n=== Project Status ===" -ForegroundColor Cyan

$backend = netstat -ano | findstr ":8000" | findstr "LISTENING"
$frontend = netstat -ano | findstr ":3000" | findstr "LISTENING"

if ($backend) {
    Write-Host "Backend:  RUNNING on http://localhost:8000" -ForegroundColor Green
} else {
    Write-Host "Backend:  NOT RUNNING" -ForegroundColor Red
}

if ($frontend) {
    Write-Host "Frontend: RUNNING on http://localhost:3000" -ForegroundColor Green
} else {
    Write-Host "Frontend: NOT RUNNING" -ForegroundColor Red
}

Write-Host "`nAccess: http://localhost:3000" -ForegroundColor Yellow
Write-Host ""

















