# 🔑 How to Get Platform ID & Access Tokens

## Facebook Page

### Step 1: Get Your Page ID

**Method 1 - From Facebook Page Settings (Easiest)**
1. Go to your Facebook Page
2. Click **Settings** (gear icon)
3. Click **Page Info** on the left sidebar
4. Scroll down to find **Page ID**
5. Copy the numeric ID (e.g., `123456789012345`)

**Method 2 - From Page URL**
1. Go to your Facebook Page
2. Look at the URL:
   - If URL is like `facebook.com/YourPageName`, use `YourPageName`
   - If URL shows numbers like `facebook.com/123456789`, that's your Page ID

**Method 3 - Using Graph API Explorer**
1. Go to: https://developers.facebook.com/tools/explorer/
2. In the search field, type: `me?fields=name,id`
3. Click **Submit**
4. Your Page ID will appear in the response

### Step 2: Get Facebook Access Token

**Option A - Quick Test Token (Graph API Explorer)**
1. Go to: https://developers.facebook.com/tools/explorer/
2. Click **Get Token** dropdown
3. Select **Get User Access Token**
4. Check these permissions:
   - ✅ `pages_show_list`
   - ✅ `pages_read_engagement`
   - ✅ `pages_read_user_content`
   - ✅ `read_insights`
5. Click **Generate Access Token**
6. Log in and authorize
7. Copy the token shown (starts with `EAAA...`)

**⚠️ Note**: This token expires in 1-2 hours (for testing only)

**Option B - Long-Lived Token (Recommended)**

1. **Get Short-Lived Token** (from Option A above)

2. **Convert to Long-Lived Token**:
   - Go to: https://developers.facebook.com/tools/debug/accesstoken/
   - Paste your short-lived token
   - Click **Debug**
   - Click **Extend Access Token**
   - Copy the new token (valid for 60 days)

3. **Get Page Access Token** (Never Expires):
   ```
   Visit this URL (replace YOUR_TOKEN with your long-lived token):
   
   https://graph.facebook.com/v18.0/me/accounts?access_token=YOUR_TOKEN
   ```
   
   - Find your page in the response
   - Copy the `access_token` for that page
   - This token never expires! 🎉

### Step 3: Test Your Facebook Credentials

Visit this URL (replace with your values):
```
https://graph.facebook.com/v18.0/PAGE_ID?fields=name,fan_count,followers_count&access_token=YOUR_TOKEN
```

If you see your page data, it's working! ✅

---

## Instagram Business Account

### Prerequisites
- Instagram account must be a **Business** or **Creator** account
- Must be linked to a Facebook Page

### Step 1: Convert to Business Account (if needed)

1. Open Instagram app
2. Go to **Profile** → **Settings** → **Account**
3. Tap **Switch to Professional Account**
4. Choose **Business** or **Creator**
5. Connect to your Facebook Page

### Step 2: Get Instagram Account ID

**Method 1 - Via Facebook Graph API Explorer**
1. Go to: https://developers.facebook.com/tools/explorer/
2. Get a token with `instagram_basic` permission
3. Enter this query:
   ```
   PAGE_ID?fields=instagram_business_account
   ```
4. Click **Submit**
5. Copy the `instagram_business_account` ID

**Method 2 - Via Graph API URL**
```
Visit (replace PAGE_ID and YOUR_TOKEN):

https://graph.facebook.com/v18.0/PAGE_ID?fields=instagram_business_account&access_token=YOUR_TOKEN
```

Response will look like:
```json
{
  "instagram_business_account": {
    "id": "17841405309211844"
  },
  "id": "123456789"
}
```

Use the `instagram_business_account` id!

### Step 3: Get Instagram Access Token

Instagram uses the **same access token** as your Facebook Page!

1. Get Facebook Page token (see Facebook section above)
2. Add Instagram permissions when generating:
   - ✅ `instagram_basic`
   - ✅ `instagram_manage_insights`
   - ✅ `pages_show_list`
   - ✅ `pages_read_engagement`

### Step 4: Test Instagram Credentials

Visit this URL (replace with your values):
```
https://graph.facebook.com/v18.0/INSTAGRAM_ACCOUNT_ID?fields=name,username,followers_count,media_count&access_token=YOUR_TOKEN
```

If you see your Instagram data, it's working! ✅

---

## Quick Setup Guide

### For Facebook:

```
Platform: Facebook
Account Name: My Brand Page
Platform ID: 123456789012345 (from Page Settings)
Access Token: EAAA... (from Graph API Explorer)
```

### For Instagram:

```
Platform: Instagram  
Account Name: @myinstagram
Platform ID: 17841405309211844 (instagram_business_account id)
Access Token: EAAA... (same as Facebook Page token)
```

---

## Common Issues & Solutions

### ❌ "Invalid OAuth access token"
- Token expired - generate a new one
- Token doesn't have required permissions
- Try long-lived or page token instead

### ❌ "Unsupported get request"
- Wrong Platform ID
- Account not set to Business/Creator
- Instagram not linked to Facebook Page

### ❌ "(#10) Application does not have permission"
- Add required permissions when generating token
- For Instagram, need both Facebook + Instagram permissions

### ❌ "This endpoint requires the 'pages_read_engagement' permission"
- Generate new token with all required permissions checked

---

## Recommended Token Types

| Platform | Token Type | Duration | Best For |
|----------|-----------|----------|----------|
| Facebook | User Token | 1-2 hours | Quick testing |
| Facebook | Long-Lived | 60 days | Development |
| Facebook | Page Token | Never expires | ✅ Production |
| Instagram | Page Token | Never expires | ✅ Production |

---

## Step-by-Step Visual Guide

### Getting Facebook Page Token (Never Expires):

1. **Get User Token**
   - Graph API Explorer → Get Token → User Access Token
   - Add permissions: `pages_show_list`, `pages_read_engagement`

2. **Extend to Long-Lived**
   - Access Token Debugger → Extend Access Token

3. **Get Page Token**
   ```
   https://graph.facebook.com/v18.0/me/accounts?access_token=YOUR_EXTENDED_TOKEN
   ```

4. **Use Page Token in Dashboard** ✅

---

## Quick Links

- **Graph API Explorer**: https://developers.facebook.com/tools/explorer/
- **Token Debugger**: https://developers.facebook.com/tools/debug/accesstoken/
- **Facebook Developers**: https://developers.facebook.com/
- **Create Facebook App**: https://developers.facebook.com/apps/

---

## Need More Help?

### Facebook API Documentation
- Graph API: https://developers.facebook.com/docs/graph-api
- Page Insights: https://developers.facebook.com/docs/graph-api/reference/insights

### Instagram API Documentation  
- Instagram Graph API: https://developers.facebook.com/docs/instagram-api
- Insights: https://developers.facebook.com/docs/instagram-api/guides/insights

---

## Security Tips

- 🔒 Never share your access tokens publicly
- 🔒 Don't commit tokens to Git repositories
- 🔒 Use page tokens (never expire) for production
- 🔒 Regenerate tokens if compromised
- 🔒 Store tokens securely in database

---

✅ Once you have your credentials, add them in the dashboard by clicking **"Manage Accounts"**!

