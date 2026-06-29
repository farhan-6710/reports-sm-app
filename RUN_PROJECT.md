# 🚀 Running the Complete Project Locally

## ✅ Current Status

### Backend Server
- **Status**: ✅ Running
- **URL**: http://localhost:8000
- **Location**: `backend/` directory

### Frontend Server  
- **Status**: ✅ Running (port 3000 is active)
- **URL**: http://localhost:3000
- **Location**: `frontend/` directory

---

## 📋 Quick Start

### Option 1: Use the Start Script (Recommended)

```powershell
cd "C:\Users\ROHIT\Downloads\Social Media Report\social_media_report"
.\START_PROJECT.ps1
```

### Option 2: Manual Start

#### Start Backend (Terminal 1)
```powershell
cd "C:\Users\ROHIT\Downloads\Social Media Report\social_media_report\backend"
php -S localhost:8000 router.php
```

#### Start Frontend (Terminal 2)
```powershell
cd "C:\Users\ROHIT\Downloads\Social Media Report\social_media_report\frontend"
npm install  # Only needed first time
npm start
```

---

## 🌐 Access the Application

Once both servers are running:

1. **Frontend Dashboard**: http://localhost:3000
   - Main application interface
   - Account management
   - Report generation
   - Analytics dashboard

2. **Backend API**: http://localhost:8000
   - API endpoints
   - Test endpoints available

---

## 🧪 Test Endpoints

### Instagram Insights Test
- **UI**: http://localhost:8000/api/test_instagram_ui.html
- **API**: http://localhost:8000/api/test_instagram_local.php?token=YOUR_TOKEN&account_id=17841408769245289&days=7

### API Health Check
- http://localhost:8000/api/reports.php/reports

---

## 📝 Features Available

### ✅ Account Management
- Add Facebook/Instagram accounts
- Manage access tokens
- View connected accounts

### ✅ Report Generation
- Organic performance reports
- Content performance analysis
- Campaign analytics
- Custom report builder

### ✅ Analytics Dashboard
- Overview metrics
- Performance summaries
- Post-level insights
- Engagement tracking

---

## 🔧 Troubleshooting

### Backend Not Starting
```powershell
# Check if port 8000 is in use
netstat -ano | findstr :8000

# Kill process if needed (replace PID)
taskkill /PID <PID> /F

# Start backend
cd backend
php -S localhost:8000 router.php
```

### Frontend Not Starting
```powershell
# Check if port 3000 is in use
netstat -ano | findstr :3000

# Install dependencies if needed
cd frontend
npm install

# Start frontend
npm start
```

### Dependencies Not Installed
```powershell
cd frontend
npm install
```

### Database Connection Issues
- Check `backend/config/database.php`
- Ensure MySQL is running
- Verify database credentials

---

## 📊 Project Structure

```
social_media_report/
├── backend/              # PHP API Server
│   ├── api/             # API endpoints
│   ├── services/         # Business logic
│   ├── config/          # Configuration
│   └── router.php       # Router for PHP server
│
├── frontend/             # React TypeScript App
│   ├── src/
│   │   ├── components/  # React components
│   │   ├── services/    # API services
│   │   └── App.tsx     # Main app
│   └── package.json
│
└── START_PROJECT.ps1    # Start script
```

---

## 🎯 Next Steps

1. **Open the Dashboard**: http://localhost:3000
2. **Add Accounts**: Click "Manage Accounts" to connect Facebook/Instagram
3. **Generate Reports**: Select account and date range
4. **View Analytics**: Explore the dashboard and reports

---

## 💡 Tips

- Keep both terminal windows open while using the app
- Frontend auto-reloads on code changes
- Backend logs errors to console
- Use browser DevTools (F12) for debugging
- Check Network tab for API calls

---

## 🔗 Useful Links

- **Graph API Explorer**: https://developers.facebook.com/tools/explorer/
- **Instagram API Docs**: https://developers.facebook.com/docs/instagram-api
- **Local Test Guide**: `LOCAL_TEST_GUIDE.md`

---

**Status**: ✅ Both servers should be running!
**Access**: http://localhost:3000
