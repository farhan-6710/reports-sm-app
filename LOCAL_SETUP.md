# Running on Local Server

## Quick Start

### Step 1: Start Backend Server

Open a terminal and run:

```bash
cd "/Users/sainarasimhanpalakolanu/Desktop/untitled folder 2/Social Media Report/backend"
php -S localhost:8000 router.php
```

**What this does:**
- Starts PHP development server on port 8000
- Uses `router.php` to handle `/api/*` routes
- Backend API will be available at `http://localhost:8000`

**Keep this terminal open!** The server runs until you stop it (Ctrl+C).

### Step 2: Start Frontend Server

Open a **new terminal** and run:

```bash
cd "/Users/sainarasimhanpalakolanu/Desktop/untitled folder 2/Social Media Report/frontend"
npm start
```

**What this does:**
- Starts React development server
- Opens browser automatically at `http://localhost:3000`
- Hot-reloads when you make code changes

**Keep this terminal open too!**

### Step 3: Access the Application

Open your browser and go to:
```
http://localhost:3000
```

## Verify Everything is Running

### Check Backend
Visit: `http://localhost:8000/api/oauth_login.php?action=get_login_url&type=organic`

You should see JSON response with a `login_url`.

### Check Frontend
Visit: `http://localhost:3000`

You should see the Social Media Analytics dashboard.

## Troubleshooting

### Port Already in Use

**Backend (port 8000):**
```bash
# Find what's using port 8000
lsof -ti:8000

# Kill it
kill -9 $(lsof -ti:8000)

# Or use a different port
php -S localhost:8001 router.php
# Then update frontend/src/services/api.js to use port 8001
```

**Frontend (port 3000):**
```bash
# Find what's using port 3000
lsof -ti:3000

# Kill it
kill -9 $(lsof -ti:3000)

# Or React will ask to use a different port automatically
```

### Database Connection Errors

Make sure MySQL is running:
```bash
# Check if MySQL is running
mysql -u root -p

# If not, start it (macOS)
brew services start mysql
# or
sudo /usr/local/mysql/support-files/mysql.server start
```

### CORS Errors

If you see CORS errors, check:
1. Backend is running on port 8000
2. Frontend is running on port 3000
3. `backend/config/config.php` has correct `FRONTEND_URL`

## Stopping the Servers

**To stop backend:**
- Go to the terminal running PHP server
- Press `Ctrl+C`

**To stop frontend:**
- Go to the terminal running React
- Press `Ctrl+C`

## Running in Background (Optional)

### Backend in Background
```bash
cd backend
php -S localhost:8000 router.php > backend.log 2>&1 &
```

### Frontend in Background
```bash
cd frontend
npm start > frontend.log 2>&1 &
```

### Stop Background Processes
```bash
# Find and kill PHP server
pkill -f "php -S localhost:8000"

# Find and kill React
pkill -f "react-scripts"
```

## Quick Commands Reference

```bash
# Start both servers (in separate terminals)
# Terminal 1:
cd backend && php -S localhost:8000 router.php

# Terminal 2:
cd frontend && npm start

# Check if servers are running
lsof -ti:8000  # Backend
lsof -ti:3000  # Frontend

# Stop servers
pkill -f "php -S localhost:8000"
pkill -f "react-scripts"
```

## What's Running Where

- **Backend API:** `http://localhost:8000`
  - API endpoints: `http://localhost:8000/api/*`
  - Example: `http://localhost:8000/api/accounts.php`

- **Frontend App:** `http://localhost:3000`
  - Main app: `http://localhost:3000`
  - Privacy Policy: `http://localhost:3000/privacy-policy`

- **Database:** `localhost:3306` (MySQL default)
  - Database name: `social_media_reports`

## Next Steps

Once both servers are running:
1. Open `http://localhost:3000` in your browser
2. Test the OAuth login flow
3. Connect Facebook/Instagram accounts
4. Generate reports!

