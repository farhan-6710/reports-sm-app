# Quick Production Deployment Guide

## Fastest Way to Deploy

### Option 1: Vercel (Frontend) + Railway/Render (Backend) - Easiest

**Frontend (Vercel):**
1. Push code to GitHub
2. Go to vercel.com, import your repo
3. Set build command: `cd frontend && npm install && npm run build`
4. Set output directory: `frontend/build`
5. Add environment variable: `REACT_APP_API_URL=https://your-backend-url.com`
6. Deploy!

**Backend (Railway/Render):**
1. Push code to GitHub
2. Go to railway.app or render.com
3. Create new service from GitHub repo
4. Set root directory: `backend`
5. Add environment variables (see below)
6. Deploy!

### Option 2: Single Server (VPS)

**Quick Setup:**
```bash
# 1. Build frontend
cd frontend
npm install
npm run build

# 2. Upload to server
scp -r frontend/build/* user@server:/var/www/html/
scp -r backend/* user@server:/var/www/backend/

# 3. Set up database
ssh user@server
mysql -u root -p < backend/schema.sql

# 4. Configure Nginx/Apache
# 5. Set environment variables
# 6. Test!
```

## Required Environment Variables

```bash
# Backend
FACEBOOK_APP_ID=872614585203502
FACEBOOK_APP_SECRET=your_secret
FACEBOOK_REDIRECT_URI=https://yourdomain.com/oauth/callback
TOKEN_ENCRYPTION_KEY=generate_with_openssl_rand_base64_32
FRONTEND_URL=https://yourdomain.com
API_URL=https://api.yourdomain.com

# Frontend (build time)
REACT_APP_API_URL=https://api.yourdomain.com
```

## Facebook App Updates Needed

1. **Switch to Live Mode**
2. **Add Production URLs:**
   - Valid OAuth Redirect URIs: `https://yourdomain.com/oauth/callback`
   - App Domains: `yourdomain.com`
   - Privacy Policy: `https://yourdomain.com/privacy-policy`
   - Site URL: `https://yourdomain.com`

## Testing Checklist

- [ ] OAuth login works
- [ ] Accounts can be connected
- [ ] Reports generate successfully
- [ ] PDF/Excel downloads work
- [ ] Privacy policy page loads
- [ ] HTTPS is enabled everywhere
- [ ] No CORS errors in console

## Need Help?

See `PRODUCTION_DEPLOYMENT.md` for detailed instructions.

