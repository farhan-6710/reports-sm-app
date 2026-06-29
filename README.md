# Social Media Analytics Dashboard

A comprehensive platform for fetching, analyzing, and comparing social media reports across multiple platforms including Facebook and Instagram. Built with React TypeScript frontend and PHP backend.

## Features

### 📊 Analytics & Reporting
- **Multi-Platform Support**: Facebook, Instagram (extensible to Twitter, LinkedIn, YouTube)
- **Organic Metrics**: Followers, impressions, reach, engagements, profile views
- **Inorganic/Paid Metrics**: Ad spend, impressions, clicks, conversions
- **Real-time Data**: Fresh data from social media APIs

### 📈 Comparison Analysis
- **Week-over-Week Comparison**: Track weekly growth
- **Month-over-Month Comparison**: Monitor monthly performance
- **Growth Percentages**: Visual indicators for positive/negative trends
- **Period-wise Charts**: Bar charts and line graphs for visualization

### 💾 Export & Download
- **PDF Reports**: Professional formatted reports with tables
- **CSV Downloads**: Raw data export for Excel analysis
- **Historical Reports**: Access to all previous reports

### 🔐 Authentication & Security
- **Platform Integration**: Secure OAuth token management
- **Business Manager Support**: Handle multiple business accounts
- **Role-based Access**: User management system

### 🎨 Modern UI/UX
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Material-UI Components**: Clean, professional interface
- **Interactive Charts**: Recharts for data visualization
- **Real-time Updates**: Instant data refresh

## Tech Stack

### Frontend
- React 18 with TypeScript
- Material-UI (MUI) for components
- Recharts for data visualization
- React Router for navigation
- Axios for API calls
- jsPDF for PDF generation

### Backend
- PHP 7.4+
- MySQL Database
- Facebook Graph API
- Instagram Graph API
- CORS-enabled REST API

## Installation & Setup

### Prerequisites
- Node.js 16+ and npm
- PHP 7.4+ with curl extension
- MySQL 5.7+
- Composer (optional)

### Backend Setup

1. **Database Configuration**
```bash
# Navigate to backend directory
cd backend

# Import database schema
mysql -u root -p < schema.sql
```

2. **Configure API Keys**
Edit `backend/config/config.php` and add your social media API credentials:
```php
define('FACEBOOK_APP_ID', 'your_app_id');
define('FACEBOOK_APP_SECRET', 'your_app_secret');
// ... other credentials
```

3. **Start PHP Server**
```bash
php -S localhost:8000 -t backend/api
```

### Frontend Setup

1. **Install Dependencies**
```bash
cd frontend
npm install
```

2. **Start Development Server**
```bash
npm start
```

The application will open at `http://localhost:3000`

## Usage Guide

### Connecting Your Accounts

1. **Facebook**
   - Get Access Token from [Facebook Graph API Explorer](https://developers.facebook.com/tools/explorer/)
   - Enter your Page ID or Username
   - Paste the access token
   - Select date range and generate report

2. **Instagram**
   - Connect through Facebook Business Manager
   - Use Instagram Business Account ID
   - Get access token with instagram_basic permissions
   - Generate report

### Generating Reports

1. Select platform (Facebook/Instagram)
2. Choose time period (Week/Month)
3. Enter Platform ID and Access Token
4. Click "Generate" to fetch data
5. View metrics and comparison charts
6. Download as PDF or CSV

### Comparison Analysis

- View growth percentages for each metric
- Compare current vs previous period
- Analyze trends with visual charts
- Identify best and worst performing metrics

## API Endpoints

### Reports
- `GET /api/reports.php/reports` - Get all reports
- `POST /api/reports.php/reports` - Generate new report
- `GET /api/reports.php/comparison` - Get comparison data

## Project Structure

```
Social Media Report/
├── frontend/
│   ├── src/
│   │   ├── components/       # React components
│   │   ├── services/         # API services
│   │   ├── utils/           # Helper functions
│   │   └── App.tsx          # Main app component
│   └── public/              # Static files
├── backend/
│   ├── api/                 # API endpoints
│   ├── config/              # Configuration files
│   ├── services/            # Platform services
│   ├── middleware/          # Auth & validation
│   └── schema.sql           # Database schema
└── README.md
```

## Authentication Flow

1. User gets OAuth token from social platform
2. Token stored securely in database
3. API calls made with stored credentials
4. Data fetched and processed
5. Reports generated and stored

## Future Enhancements

- [ ] Auto-refresh reports at scheduled intervals
- [ ] Email report delivery
- [ ] Slack/Teams integration
- [ ] Custom metric calculations
- [ ] Team collaboration features
- [ ] More platforms (Twitter, LinkedIn, YouTube, TikTok)
- [ ] AI-powered insights and recommendations

## Security Notes

- Store access tokens securely (use encryption in production)
- Implement proper user authentication
- Use HTTPS in production
- Validate all user inputs
- Rate limit API calls
- Follow platform API guidelines

## Troubleshooting

**Issue**: Reports not generating
- Check API credentials are valid
- Verify access tokens haven't expired
- Ensure database is properly connected
- Check backend server is running

**Issue**: CORS errors
- Verify backend CORS headers in config.php
- Check frontend API URL matches backend

**Issue**: Charts not displaying
- Clear browser cache
- Check browser console for errors
- Verify data format from API

## Contributing

1. Fork the repository
2. Create feature branch
3. Commit changes
4. Push and create pull request

## License

MIT License - Feel free to use for your projects

## Support

For issues, questions, or contributions:
- Open an issue on GitHub
- Contact the development team

---

**Built for Digital Marketers** 📱📊✨

