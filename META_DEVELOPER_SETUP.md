# 🔧 Complete Meta Developer Account Setup Guide

## Step-by-Step Process to Get Instagram & Facebook Access

---

## Part 1: Create Meta Developer Account

### Step 1: Go to Meta for Developers
Visit: **https://developers.facebook.com/**

### Step 2: Click "Get Started"
- Top-right corner of the page
- Or go directly to: **https://developers.facebook.com/async/registration/**

### Step 3: Complete Registration
You'll see 3 steps:

#### A. Register
- Use your **existing Facebook account**
- Or create a new one
- Click "Continue"

#### B. Contact Info
- Enter your **email address**
- Check your email for verification code
- Enter the 6-digit code
- **⚠️ If you see "You can't make this change" error:**
  - Wait 24-48 hours
  - Use a device you normally use for Facebook
  - Clear cookies and try again
  - Or skip to Part 5 (Alternative Method) below

#### C. About You
- Select your role: **Developer** or **Business**
- Choose country
- Agree to terms
- Click "Complete Registration"

### Step 4: Verify Your Account
- Check email for verification link
- Click to verify
- Return to developers.facebook.com

---

## Part 2: Create a Facebook App

### Step 1: Create App
1. Go to: **https://developers.facebook.com/apps/**
2. Click **"Create App"** button
3. Select app type:
   - Choose **"Business"** (recommended for analytics)
   - Or **"Consumer"** (for basic access)
4. Click **"Next"**

### Step 2: App Details
Fill in the form:
- **App Name**: "Social Media Analytics" (or your choice)
- **App Contact Email**: Your email
- **Business Account**: Select or create one (optional)
- Click **"Create App"**

### Step 3: Complete Security Check
- Solve the captcha
- App will be created

---

## Part 3: Add Facebook & Instagram Products

### For Facebook Pages:

#### Step 1: Add Facebook Login
1. In your app dashboard, find **"Add Products"** 
2. Click **"Set Up"** on **"Facebook Login"**
3. Choose platform: **"Web"**
4. Enter Site URL: `http://localhost:3000`
5. Click **"Save"**

#### Step 2: Configure Settings
1. Left menu: **Facebook Login** → **Settings**
2. Add to **Valid OAuth Redirect URIs**:
   ```
   http://localhost:3000
   https://developers.facebook.com/tools/explorer/callback
   ```
3. Click **"Save Changes"**

### For Instagram:

#### Step 1: Add Instagram Product
1. Find **"Instagram Graph API"** in products
2. Click **"Set Up"**
3. Follow the setup wizard

#### Step 2: Connect Instagram Account
**Prerequisites:**
- Your Instagram must be a **Business** or **Creator** account
- Must be connected to a Facebook Page

**To connect:**
1. Go to Instagram app
2. Settings → Account → Switch to Professional Account
3. Choose Business or Creator
4. Connect to your Facebook Page

---

## Part 4: Get Access Tokens

### Method 1: Using Graph API Explorer (Quick Test)

#### Step 1: Open Graph API Explorer
Visit: **https://developers.facebook.com/tools/explorer/**

#### Step 2: Select Your App
- Top dropdown: Select your newly created app
- If it says "Graph API Explorer" app, switch to yours

#### Step 3: Generate User Token
1. Click **"Generate Access Token"** dropdown
2. Select **"Get User Access Token"**
3. Check these permissions:

**For Facebook Pages:**
```
✅ pages_show_list
✅ pages_read_engagement
✅ pages_read_user_content
✅ read_insights
✅ pages_manage_metadata
```

**For Instagram (add these too):**
```
✅ instagram_basic
✅ instagram_manage_insights
✅ instagram_content_publish (optional)
```

4. Click **"Generate Access Token"**
5. Review permissions and click **"Continue"**
6. Copy the token (starts with `EAAA...`)

**⚠️ Important:** This token expires in 1-2 hours!

#### Step 4: Get Page ID
1. In the Graph API Explorer query box, enter: `me/accounts`
2. Click **"Submit"**
3. You'll see a list of your pages
4. Copy the `id` of the page you want

#### Step 5: Get Instagram Account ID
1. In query box, enter: `YOUR_PAGE_ID?fields=instagram_business_account`
2. Replace `YOUR_PAGE_ID` with your page ID
3. Click **"Submit"**
4. Copy the `instagram_business_account` → `id`

#### Step 6: Test It
Query to test Facebook:
```
YOUR_PAGE_ID?fields=name,fan_count,followers_count
```

Query to test Instagram:
```
YOUR_IG_ACCOUNT_ID?fields=username,followers_count,media_count
```

---

### Method 2: Get Long-Lived Token (Lasts 60 Days)

#### Step 1: Get Short-Lived Token
Follow Method 1 above to get initial token

#### Step 2: Exchange for Long-Lived Token
Visit this URL (replace values):
```
https://graph.facebook.com/v18.0/oauth/access_token?
  grant_type=fb_exchange_token&
  client_id=YOUR_APP_ID&
  client_secret=YOUR_APP_SECRET&
  fb_exchange_token=YOUR_SHORT_LIVED_TOKEN
```

**Where to find:**
- **APP_ID**: App Dashboard → Settings → Basic → App ID
- **APP_SECRET**: App Dashboard → Settings → Basic → App Secret (click "Show")
- **SHORT_LIVED_TOKEN**: The token from Method 1

Copy the new `access_token` from the response

#### Step 3: Get Page Token (Never Expires!)
Visit this URL (replace with your long-lived token):
```
https://graph.facebook.com/v18.0/me/accounts?access_token=YOUR_LONG_LIVED_TOKEN
```

Copy the `access_token` for your specific page - **this never expires!** ✅

---

## Part 5: Alternative Method (If Security Block)

### Use Graph API Explorer Without Account Creation

If you're blocked from creating a developer account:

#### Option A: Use Existing Facebook Account
1. Go directly to: **https://developers.facebook.com/tools/explorer/**
2. You can use it with just your Facebook login
3. It will show "Graph API Explorer" app (Meta's default)
4. Generate tokens using that app
5. Limited permissions but works for basic testing

#### Option B: Ask a Team Member
1. Have a colleague who has developer access
2. They create the app
3. They add you as a developer:
   - App Dashboard → Roles → Add Developers
   - Enter your Facebook username/email
4. You can then generate tokens

#### Option C: Wait and Retry
1. **Wait 24-48 hours**
2. Keep Facebook logged in on that device
3. Browse Facebook normally
4. Then retry developer registration
5. Usually clears automatically

---

## Part 6: Add Tokens to Dashboard

### Step 1: Open Your Dashboard
Go to: **http://localhost:3000**

### Step 2: Click "Manage Accounts"
Top-right corner button

### Step 3: Add Account
Fill in the form:

**For Facebook:**
```
Platform: Facebook
Account Name: My Brand Page
Account ID: 123456789012345 (your page ID)
Access Token: EAAA... (your page token)
```

**For Instagram:**
```
Platform: Instagram
Account Name: @myhandle
Account ID: 17841405309211844 (instagram_business_account id)
Access Token: EAAA... (same as Facebook page token)
```

### Step 4: Click "Add Account"
Your credentials are saved!

### Step 5: Generate Reports
Now you can use the API-based reporting:
1. Select platform from dropdown
2. Choose time period
3. Click "Generate"
4. View automated reports! ✅

---

## 🔑 Quick Reference: Finding Your IDs

### Facebook Page ID
**Method 1:** Facebook Page → About → Page ID (at bottom)

**Method 2:** Graph API Explorer
```
me/accounts
```

### Instagram Business Account ID
**Graph API Explorer:**
```
YOUR_PAGE_ID?fields=instagram_business_account
```

### Your App ID & Secret
**App Dashboard** → Settings → Basic
- App ID: Copy the number
- App Secret: Click "Show" and copy

---

## 📋 Checklist

Before you can use API access:

- [ ] Created Meta Developer account
- [ ] Created Facebook App
- [ ] Added Facebook Login product
- [ ] Added Instagram Graph API product
- [ ] Instagram account is Business/Creator
- [ ] Instagram connected to Facebook Page
- [ ] Generated access token with permissions
- [ ] Got Facebook Page ID
- [ ] Got Instagram Business Account ID
- [ ] Tested tokens in Graph API Explorer
- [ ] Added credentials to dashboard
- [ ] Generated first automated report

---

## ⚠️ Common Issues & Solutions

### Issue 1: "You can't make this change at the moment"
**Solution:**
- Wait 24-48 hours and retry
- Use device you normally use for Facebook
- Try Option A from Part 5 (Graph Explorer directly)

### Issue 2: "Invalid OAuth access token"
**Solution:**
- Token expired - generate new one
- Missing permissions - regenerate with all checkboxes
- Wrong token type - use page token, not user token

### Issue 3: Can't find Instagram Business Account
**Solution:**
- Verify Instagram is Business/Creator account
- Check it's connected to Facebook Page
- Try disconnecting and reconnecting

### Issue 4: "Application does not have permission"
**Solution:**
- Add required permissions when generating token
- For Instagram, need both Facebook + Instagram permissions

### Issue 5: Token expires too quickly
**Solution:**
- Exchange for long-lived token (60 days)
- Get page token (never expires)
- Follow Method 2 in Part 4

---

## 🎯 Token Lifespan

| Token Type | Duration | Use Case |
|------------|----------|----------|
| User Token | 1-2 hours | Quick testing |
| Long-Lived User Token | 60 days | Development |
| Page Token | Never expires ✅ | Production |
| Instagram Token | Same as Page Token | Production |

**Always use Page Tokens for your dashboard!**

---

## 📞 Support Links

- **Developer Portal**: https://developers.facebook.com/
- **App Dashboard**: https://developers.facebook.com/apps/
- **Graph API Explorer**: https://developers.facebook.com/tools/explorer/
- **Access Token Debugger**: https://developers.facebook.com/tools/debug/accesstoken/
- **Graph API Docs**: https://developers.facebook.com/docs/graph-api
- **Instagram API Docs**: https://developers.facebook.com/docs/instagram-api
- **Support**: https://developers.facebook.com/support/

---

## 🚀 Next Steps After Setup

1. **Test in Dashboard**
   - Generate your first API report
   - Verify data is accurate
   - Download PDF/CSV

2. **Set Up Multiple Accounts**
   - Add all your client pages
   - Store tokens securely
   - Manage from one dashboard

3. **Schedule Regular Reports**
   - Generate weekly/monthly
   - Track growth over time
   - Compare performance

4. **Optimize Token Management**
   - Use never-expiring page tokens
   - Store securely in database
   - Don't commit to Git

---

## 💡 Pro Tips

1. **Token Security**
   - Never share tokens publicly
   - Don't commit to Git repositories
   - Regenerate if compromised

2. **Permissions**
   - Only request permissions you need
   - Users must approve each permission
   - Some permissions require app review

3. **Rate Limits**
   - Graph API has rate limits
   - Don't spam requests
   - Cache data when possible

4. **Testing**
   - Always test tokens before saving
   - Use Graph API Explorer to debug
   - Check token expiration dates

5. **Production Ready**
   - Use page tokens (never expire)
   - Implement error handling
   - Monitor for API changes

---

## ✅ Success!

Once you complete these steps:
- ✅ Full automated reporting
- ✅ Real-time data from APIs
- ✅ No manual data entry needed
- ✅ Schedule reports automatically
- ✅ Professional client deliverables

**Your dashboard will be fully powered by official Meta APIs!** 🎉

---

**Estimated Time:** 
- Quick setup (short-lived tokens): **15-30 minutes**
- Complete setup (page tokens): **30-45 minutes**
- Worth it for automated reporting! 📊✨

