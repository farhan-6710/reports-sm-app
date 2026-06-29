# How to Get Facebook IDs

## Types of Facebook IDs

There are several types of Facebook IDs you might need:

1. **Facebook Page ID** - For connecting Facebook Pages
2. **Facebook User ID** - For identifying users
3. **Instagram Business Account ID** - For Instagram accounts
4. **Facebook App ID** - You already have this: `872614585203502`

## Method 1: Using Graph API Explorer (Easiest)

### Step 1: Open Graph API Explorer
1. Go to: https://developers.facebook.com/tools/explorer/
2. Select your app: **SM Analytics 5** (or your app name)
3. Click "Get Token" → "Get User Access Token"

### Step 2: Get Your User ID
1. In the API field, enter: `me`
2. Click "Submit"
3. You'll see your user ID in the response: `"id": "123456789"`

### Step 3: Get Your Page IDs
1. In the API field, enter: `me/accounts`
2. Click "Submit"
3. You'll see all your pages with their IDs:
   ```json
   {
     "data": [
       {
         "id": "123456789012345",  // This is your Page ID
         "name": "Your Page Name",
         "access_token": "..."
       }
     ]
   }
   ```

### Step 4: Get Instagram Business Account ID
1. In the API field, enter: `me/accounts?fields=id,name,instagram_business_account`
2. Click "Submit"
3. You'll see Instagram IDs linked to your pages:
   ```json
   {
     "data": [
       {
         "id": "123456789012345",
         "name": "Your Page",
         "instagram_business_account": {
           "id": "17841476214409160"  // This is your Instagram ID
         }
       }
     ]
   }
   ```

## Method 2: From Facebook Page Settings

### Get Page ID from Page Settings:
1. Go to your Facebook Page
2. Click **Settings** (left sidebar)
3. Scroll down to **Page Info**
4. Look for **Page ID** (you may need to scroll further)
5. Or check the URL: `facebook.com/your-page-name`
6. Click **About** tab
7. Scroll to find **Page ID**

### Alternative: Check Page Source
1. Go to your Facebook Page
2. Right-click → **View Page Source** (or Ctrl+U / Cmd+U)
3. Press Ctrl+F (or Cmd+F) to search
4. Search for: `"page_id":"`
5. The number after it is your Page ID

## Method 3: Using Your App (Automatic)

### Via OAuth Login (Recommended):
1. Go to your app: `http://localhost:3000`
2. Click **"Manage All Accounts"**
3. Click **"Connect via Facebook Login"**
4. Log in and authorize
5. Your app will automatically:
   - Get your User ID
   - Get all your Page IDs
   - Get all Instagram Business Account IDs
   - Show them in a list for you to select

**No manual ID entry needed!** ✅

## Method 4: From Page URL

### If you have the Page Username:
1. Go to: `https://www.facebook.com/your-page-username`
2. View page source (right-click → View Source)
3. Search for `"page_id":"` or `"profile_owner":"`
4. The number is your Page ID

### Using Facebook's ID Finder:
1. Go to: https://findmyfbid.com/
2. Enter your Page URL: `https://www.facebook.com/your-page`
3. Click "Find Numeric ID"
4. You'll get the Page ID

## Method 5: Using Graph API (Programmatic)

### Get Page ID from Username:
```bash
curl "https://graph.facebook.com/v18.0/your-page-username?access_token=YOUR_TOKEN"
```

Response:
```json
{
  "id": "123456789012345",  // Page ID
  "name": "Your Page Name"
}
```

### Get All Pages for a User:
```bash
curl "https://graph.facebook.com/v18.0/me/accounts?access_token=YOUR_TOKEN"
```

## Method 6: From Your Database

If you've already connected accounts via OAuth:

1. Check your database:
   ```sql
   SELECT account_id, account_name, platform 
   FROM accounts 
   WHERE platform = 'facebook';
   ```

2. Or use the API:
   ```bash
   curl http://localhost:8000/api/accounts.php
   ```

## Quick Reference

| What You Need | How to Get It |
|--------------|---------------|
| **Page ID** | Graph API Explorer: `me/accounts` |
| **User ID** | Graph API Explorer: `me` |
| **Instagram ID** | Graph API Explorer: `me/accounts?fields=instagram_business_account` |
| **App ID** | You already have: `872614585203502` |

## For Your App

**You don't need to manually get IDs!** 

Just use **OAuth Login**:
1. Click "Connect via Facebook Login"
2. Authorize your app
3. All IDs are automatically discovered
4. Select which accounts to connect

The app handles everything automatically! 🎉

## Troubleshooting

### Can't find Page ID?
- Make sure you're an admin of the page
- Try Graph API Explorer with a valid token
- Check that the page is published (not draft)

### ID format:
- Page IDs are usually 15-16 digits
- User IDs are usually 10-15 digits
- Instagram IDs are usually 17-18 digits

### Example IDs:
- Page ID: `123456789012345`
- User ID: `1234567890`
- Instagram ID: `17841476214409160`

## Need Help?

If you're having trouble finding an ID:
1. Use Graph API Explorer (easiest method)
2. Or just use OAuth Login in your app (automatic)

The OAuth method is recommended because it:
- ✅ Gets all IDs automatically
- ✅ Gets valid access tokens
- ✅ No manual entry needed
- ✅ Works for multiple pages at once

