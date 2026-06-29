# OAuth Login Flow - Complete Guide

## How It Works

### Overview
Your application uses **ONE Facebook App** (App ID: `872614585203502`) that allows **ANY user** to log in with their own Facebook account and connect their own pages/ad accounts. Each user's accounts are tracked separately.

### Complete Flow

#### Step 1: User Initiates Login
1. User clicks **"Connect via Facebook Login"** in your app
2. Frontend calls: `GET /api/oauth_login.php?action=get_login_url&type=organic`
3. Backend generates a secure `state` token and stores it in database
4. Backend returns Facebook OAuth URL with:
   - Your App ID
   - Required permissions (pages, Instagram, insights)
   - Redirect URI: `http://localhost:3000/oauth/callback`
   - State token (for security)

#### Step 2: User Authorizes on Facebook
1. User is redirected to Facebook login page
2. User logs in with **their own Facebook account**
3. Facebook shows permission dialog:
   - ✅ Access to your Facebook Pages
   - ✅ Access to Instagram Business accounts  
   - ✅ Read page insights and engagement
4. User clicks **"Continue"** or **"Allow"**

#### Step 3: Facebook Redirects Back
1. Facebook redirects to: `http://localhost:3000/oauth/callback?code=AUTH_CODE&state=STATE_TOKEN`
2. Frontend detects the `code` and `state` in URL
3. Frontend calls: `GET /api/oauth_login.php?action=exchange_token&code=...&state=...`

#### Step 4: Backend Exchanges Code for Token
1. Backend validates the `state` token (prevents CSRF attacks)
2. Backend calls Facebook API to exchange `code` for access token
3. Backend exchanges short-lived token for **long-lived token** (60 days)
4. Backend gets Facebook user info (ID, name) to track who connected
5. Backend stores encrypted token and user info in database

#### Step 5: User Selects Accounts
1. Frontend calls: `GET /api/oauth_login.php?action=get_accounts&state=...`
2. Backend uses the access token to fetch user's Facebook Pages
3. Backend also fetches Instagram Business accounts linked to those pages
4. Frontend displays list of available pages/accounts
5. User selects which accounts they want to connect

#### Step 6: Accounts Are Saved
1. User clicks **"Connect X Account(s)"**
2. Frontend calls: `POST /api/oauth_login.php?action=connect_accounts`
3. Backend:
   - Gets Facebook user ID from stored token
   - Creates/finds user record in database
   - Fetches Page Access Tokens (never expire!)
   - Saves each selected account with:
     - User ID (who owns it)
     - Platform (Facebook/Instagram)
     - Account name and ID
     - Encrypted access token
4. Success! Accounts are now connected

### Key Points

✅ **One App, Many Users**: Your single Facebook App can handle unlimited users  
✅ **User Tracking**: Each account is associated with the Facebook user who connected it  
✅ **Secure Tokens**: All tokens are encrypted in the database  
✅ **Long-Lived Tokens**: Page tokens never expire (user tokens last 60 days)  
✅ **No Manual Entry**: Users never see or enter tokens manually  

### Permissions Requested

When users log in, they grant your app:
- `pages_show_list` - See their Facebook Pages
- `pages_read_engagement` - Read page metrics
- `pages_read_user_content` - Read page posts
- `read_insights` - Access analytics
- `instagram_basic` - Access Instagram accounts
- `instagram_manage_insights` - Read Instagram metrics
- `business_management` - Access Business Manager data

### Database Schema

**oauth_states** - Tracks OAuth sessions:
- `state_token` - Security token
- `facebook_user_id` - Who authorized
- `access_token` - Encrypted user token
- `created_at` - When session started

**accounts** - Stores connected accounts:
- `user_id` - Which user owns this account
- `platform` - Facebook or Instagram
- `account_id` - Page/Account ID
- `access_token` - Encrypted token (never expires for pages!)

**users** - Tracks users:
- `id` - Internal user ID
- `username` - `fb_{facebook_user_id}`
- `email` - Auto-generated

### Security Features

1. **State Token**: Prevents CSRF attacks
2. **Token Encryption**: All tokens encrypted at rest
3. **User Isolation**: Each user only sees their own accounts
4. **Token Expiry**: Long-lived tokens expire after 60 days (user needs to reconnect)

### Next Steps for Production

1. **User Sessions**: Add session management so users stay logged in
2. **Token Refresh**: Auto-refresh tokens before expiry
3. **Multi-User UI**: Filter accounts by logged-in user
4. **HTTPS**: Use HTTPS in production (ngrok for testing)

