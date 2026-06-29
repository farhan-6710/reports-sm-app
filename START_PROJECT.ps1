# Start Complete Project Locally
# Run this script to start both backend and frontend servers

Write-Host "`n╔═══════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Starting Social Media Analytics Dashboard                ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# Check if backend is running
$backendRunning = netstat -ano | findstr :8000 | findstr LISTENING
if ($backendRunning) {
    Write-Host "✅ Backend server is already running on port 8000" -ForegroundColor Green
} else {
    Write-Host "🚀 Starting backend server..." -ForegroundColor Yellow
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\backend'; php -S localhost:8000 router.php"
    Start-Sleep -Seconds 2
    Write-Host "✅ Backend server started on http://localhost:8000" -ForegroundColor Green
}

# Check if frontend dependencies are installed
$frontendPath = Join-Path $PSScriptRoot "frontend"
if (-not (Test-Path (Join-Path $frontendPath "node_modules"))) {
    Write-Host "`n📦 Installing frontend dependencies..." -ForegroundColor Yellow
    Set-Location $frontendPath
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to install dependencies" -ForegroundColor Red
        exit 1
    }
    Write-Host "✅ Dependencies installed" -ForegroundColor Green
}

# Check if frontend is running
$frontendRunning = netstat -ano | findstr :3000 | findstr LISTENING
if ($frontendRunning) {
    Write-Host "✅ Frontend server is already running on port 3000" -ForegroundColor Green
} else {
    Write-Host "`n🚀 Starting frontend server..." -ForegroundColor Yellow
    Set-Location $frontendPath
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$frontendPath'; npm start"
    Write-Host "✅ Frontend server starting on http://localhost:3000" -ForegroundColor Green
    Write-Host "   (This may take a minute to compile...)" -ForegroundColor Gray
}

Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Cyan
Write-Host "`n✅ Project is starting!" -ForegroundColor Green
Write-Host "`n📋 Access URLs:" -ForegroundColor Yellow
Write-Host "   Frontend: http://localhost:3000" -ForegroundColor White
Write-Host "   Backend API: http://localhost:8000" -ForegroundColor White
Write-Host "`n📝 Note:" -ForegroundColor Yellow
Write-Host "   - Backend server is running in a separate window" -ForegroundColor Gray
Write-Host "   - Frontend server is starting in another window" -ForegroundColor Gray
Write-Host "   - Keep both windows open while using the application" -ForegroundColor Gray
Write-Host "   - Frontend will automatically open in your browser" -ForegroundColor Gray
Write-Host "`n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`n" -ForegroundColor Cyan

















