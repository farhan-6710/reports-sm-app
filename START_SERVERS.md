# How to Start the Project

## Quick Start

### 1. Start Backend Server (PHP)

Open a terminal and run:
```powershell
cd "C:\Users\ROHIT\Downloads\Social Media Report\social_media_report\backend"
php -S localhost:8000 router.php
```

**Important:** The server MUST be started with `router.php` to handle API routing correctly.

### 2. Start Frontend Server (React)

Open a **new** terminal and run:
```powershell
cd "C:\Users\ROHIT\Downloads\Social Media Report\social_media_report\frontend"
npm start
```

The frontend will automatically open at `http://localhost:3000`

## Verify Everything is Working

1. **Backend API Test:**
   - Open browser: http://localhost:8000/api/accounts.php
   - Should return JSON with `{"success":true,"data":[...]}`

2. **Frontend:**
   - Should load at http://localhost:3000
   - No 404 errors in browser console
   - Network tab should show successful API calls

## Troubleshooting

### Backend returns 404 errors
- Make sure you started the server with `router.php`
- Check that you're in the `backend` directory
- Verify PHP is running: `php --version`

### Frontend can't connect to backend
- Check backend is running on port 8000
- Check browser console for CORS errors
- Verify API URL in Network tab

### Database connection errors
- Ensure MySQL is running
- Check database credentials in `backend/config/database.php`
- Import schema: `mysql -u root -p < backend/schema.sql`

## Stopping Servers

Press `Ctrl+C` in each terminal window to stop the servers.




















