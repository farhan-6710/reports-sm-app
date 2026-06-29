# Production Deployment Guide

## Prerequisites

- Web server with PHP 7.4+ and MySQL
- Node.js 16+ for building React app
- Domain name with SSL certificate
- Facebook App configured for production

## Step 1: Prepare Backend for Production

### 1.1 Update Configuration

Edit `backend/config/config.php`:

```php
// Production URLs
define('API_URL', 'https://api.yourdomain.com');
define('FRONTEND_URL', 'https://yourdomain.com');

// Use environment variables for secrets
define('FACEBOOK_APP_ID', getenv('FACEBOOK_APP_ID') ?: '872614585203502');
define('FACEBOOK_APP_SECRET', getenv('FACEBOOK_APP_SECRET'));
define('FACEBOOK_REDIRECT_URI', 'https://yourdomain.com/oauth/callback');
define('TOKEN_ENCRYPTION_KEY', getenv('TOKEN_ENCRYPTION_KEY')); // Generate strong key!
```

### 1.2 Generate Strong Encryption Key

```bash
# Generate a secure 32-character key
openssl rand -base64 32
```

Set this as `TOKEN_ENCRYPTION_KEY` environment variable.

### 1.3 Database Setup

```bash
# On production server
mysql -u root -p
CREATE DATABASE social_media_reports;
USE social_media_reports;
SOURCE backend/schema.sql;
SOURCE backend/migrations/add_user_tracking.sql;
```

### 1.4 Deploy Backend Files

Upload to your server:
```
backend/
├── api/
├── config/
├── services/
├── middleware/
├── utils/
└── router.php
```

### 1.5 Configure Web Server

**For Apache (.htaccess):**
```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^api/(.*)$ router.php [L,QSA]
```

**For Nginx:**
```nginx
location /api/ {
    try_files $uri $uri/ /router.php?$query_string;
}
```

## Step 2: Build and Deploy Frontend

### 2.1 Build React App

```bash
cd frontend
npm install
npm run build
```

This creates a `build/` folder with production-ready files.

### 2.2 Update API Base URL

Edit `frontend/src/services/api.js` before building:

```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://api.yourdomain.com';
```

Or set environment variable:
```bash
REACT_APP_API_URL=https://api.yourdomain.com npm run build
```

### 2.3 Deploy Build Folder

Upload `frontend/build/` contents to your web server:
- Option A: Same domain (e.g., `https://yourdomain.com`)
- Option B: CDN (Cloudflare, AWS CloudFront, etc.)

### 2.4 Configure Web Server for React Router

**For Apache (.htaccess in build folder):**
```apache
Options -MultiViews
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ index.html [QR,L]
```

**For Nginx:**
```nginx
location / {
    try_files $uri $uri/ /index.html;
}
```

## Step 3: Update Facebook App Settings

### 3.1 Switch App to Live Mode

1. Go to Facebook App Dashboard
2. Toggle "App Mode" from "Development" to "Live"
3. Complete any required verifications

### 3.2 Update OAuth Settings

**Facebook Login → Settings:**
- **Valid OAuth Redirect URIs:** Add:
  ```
  https://yourdomain.com/oauth/callback
  ```
- **Enforce HTTPS:** Keep enabled (Yes)
- **Use Strict Mode:** Keep enabled (Yes)

### 3.3 Update Basic Settings

**Settings → Basic:**
- **App Domains:** Add your production domain:
  ```
  yourdomain.com
  ```
- **Privacy Policy URL:** 
  ```
  https://yourdomain.com/privacy-policy
  ```
- **Site URL:**
  ```
  https://yourdomain.com
  ```

### 3.4 Request Advanced Access (if needed)

For production, you may need:
- `pages_read_engagement` - Advanced Access
- `instagram_manage_insights` - Advanced Access
- `read_insights` - Advanced Access

Go to **App Review → Permissions and Features** to request.

## Step 4: Environment Variables

Set on your production server:

```bash
# Backend (.env or server environment)
FACEBOOK_APP_ID=872614585203502
FACEBOOK_APP_SECRET=your_secret_here
FACEBOOK_REDIRECT_URI=https://yourdomain.com/oauth/callback
TOKEN_ENCRYPTION_KEY=your_32_char_key_here
FRONTEND_URL=https://yourdomain.com
API_URL=https://api.yourdomain.com

# Database
DB_HOST=localhost
DB_NAME=social_media_reports
DB_USER=your_db_user
DB_PASS=your_db_password
```

## Step 5: Security Checklist

- [ ] Use HTTPS everywhere
- [ ] Set strong `TOKEN_ENCRYPTION_KEY`
- [ ] Use environment variables for secrets
- [ ] Enable PHP error logging (disable display_errors)
- [ ] Set proper file permissions (644 for files, 755 for directories)
- [ ] Configure CORS to only allow your domain
- [ ] Set up database backups
- [ ] Enable rate limiting on API endpoints
- [ ] Use strong database passwords
- [ ] Keep PHP and dependencies updated

## Step 6: Testing in Production

### 6.1 Test OAuth Flow

1. Visit `https://yourdomain.com`
2. Click "Connect via Facebook Login"
3. Verify redirect to Facebook
4. Log in and authorize
5. Verify redirect back to your app
6. Check that accounts are listed
7. Verify accounts are saved in database

### 6.2 Test Features

- [ ] Generate organic reports
- [ ] Generate campaign reports
- [ ] Download PDF reports
- [ ] Download Excel reports
- [ ] View account list
- [ ] Disconnect accounts
- [ ] Privacy policy page loads

### 6.3 Monitor Logs

Check for errors:
```bash
# PHP errors
tail -f /var/log/php/error.log

# Web server errors
tail -f /var/log/nginx/error.log
# or
tail -f /var/log/apache2/error.log
```

## Step 7: Quick Deployment Options

### Option A: VPS (DigitalOcean, Linode, etc.)

1. Set up Ubuntu server
2. Install Nginx, PHP-FPM, MySQL
3. Deploy files via SFTP/SCP
4. Configure domain DNS
5. Set up SSL with Let's Encrypt

### Option B: Platform as a Service

**Heroku:**
- Backend: PHP buildpack
- Frontend: Static site hosting
- Database: Heroku Postgres (or external MySQL)

**Vercel/Netlify:**
- Frontend: Deploy `build/` folder
- Backend: Separate PHP hosting

### Option C: Cloud Services

**AWS:**
- Frontend: S3 + CloudFront
- Backend: EC2 or Elastic Beanstalk
- Database: RDS MySQL

**Google Cloud:**
- Frontend: Cloud Storage + CDN
- Backend: App Engine or Compute Engine
- Database: Cloud SQL

## Step 8: Post-Deployment

### 8.1 Set Up Monitoring

- Error tracking (Sentry, Rollbar)
- Uptime monitoring (UptimeRobot, Pingdom)
- Analytics (Google Analytics)

### 8.2 Set Up Backups

```bash
# Database backup script
mysqldump -u user -p social_media_reports > backup_$(date +%Y%m%d).sql
```

### 8.3 Set Up Cron Jobs

For token refresh (if needed):
```bash
# Refresh tokens daily
0 2 * * * curl https://api.yourdomain.com/api/refresh_tokens.php
```

## Troubleshooting

### CORS Errors
- Check `Access-Control-Allow-Origin` in config.php
- Verify frontend URL matches exactly

### OAuth Not Working
- Verify redirect URI matches exactly in Facebook settings
- Check HTTPS is enabled
- Verify App is in Live mode
- Check browser console for errors

### Database Connection Issues
- Verify database credentials
- Check database user has proper permissions
- Ensure database exists

### Token Errors
- Verify encryption key is set correctly
- Check tokens are being encrypted/decrypted properly
- Verify Facebook tokens haven't expired

## Support

For issues, check:
- Server error logs
- Browser console
- Facebook App Dashboard → Alerts
- Database connection status

