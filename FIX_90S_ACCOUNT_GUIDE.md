# Fix 90's Instagram Account Connection

## 🔍 Problem
- 90's account is not generating reports
- Other accounts (Armario Pro, OTC Kompally, etc.) are working fine
- Facebook page may not be linked to Instagram account

## ✅ Solution Steps

### Step 1: Verify Instagram is Linked to Facebook Page

#### Option A: Check in Instagram App
1. Open **Instagram app** on your phone
2. Go to **Profile** → **Settings** (gear icon)
3. Tap **Account** → **Linked Accounts**
4. Check if **Facebook** is linked
5. If not linked:
   - Tap **Facebook**
   - Select the **90sauthentickitchen** page
   - Complete the linking process

#### Option B: Check in Facebook Page Settings
1. Go to your Facebook page: `facebook.com/90sauthentickitchen`
2. Click **Settings** (left sidebar)
3. Look for **Instagram** section
4. If not connected, click **Connect Instagram Account**

### Step 2: Verify Instagram Account Type
Instagram must be a **Business** or **Creator** account (not Personal):

1. Open **Instagram app**
2. Go to **Profile** → **Settings** → **Account**
3. If you see **"Switch to Professional Account"**:
   - Tap it
   - Choose **Business** or **Creator**
   - Complete setup
   - Link to Facebook page during setup

### Step 3: Get Correct Instagram Business Account ID

1. Go to: **https://developers.facebook.com/tools/explorer/**
2. In top dropdown, select **"Graph API Explorer"** (not your custom app)
3. Click **"Generate Access Token"**
4. Check these permissions:
   - ✅ `instagram_basic`
   - ✅ `instagram_manage_insights`
   - ✅ `pages_show_list`
   - ✅ `pages_read_engagement`
5. Click **"Generate Token"** and authorize

6. In the query box, enter:
   ```
   me/accounts?fields=id,name,access_token,instagram_business_account{id,username}
   ```
7. Click **"Submit"**

8. Find **"90sauthentickitchen"** in the results

9. **Check the response:**
   - ✅ **If you see `instagram_business_account`** → Instagram IS linked!
     - Copy the `instagram_business_account.id` (this is your Instagram ID)
     - Copy the `access_token` from that page entry
   - ❌ **If `instagram_business_account` is missing** → Instagram is NOT linked
     - Go back to Step 1 and link them first

### Step 4: Update Account in Dashboard

1. Go to: **http://localhost:3000**
2. Click **"Manage Accounts"**
3. Find the **90's** account (or add new one)
4. Enter:
   - **Platform**: Instagram
   - **Account Name**: 90's
   - **Platform ID**: The `instagram_business_account.id` from Step 3
   - **Access Token**: The `access_token` from Step 3 (from the page, not user token)
5. Click **"Add Account"** or **"Update Account"**

### Step 5: Test the Report

1. Go to **Custom Report Builder** or **Unified Report**
2. Select **90's** account
3. Choose date range (e.g., Jan 1-31, 2026)
4. Click **Generate Report**
5. Data should now populate! ✅

---

## 🔧 Quick Fix (If Account Already Exists)

If the account exists but is inactive:

### Via Database (Quick):
```sql
-- First, get the correct Instagram ID and token from Graph API Explorer
-- Then update:
UPDATE accounts 
SET account_id = 'CORRECT_INSTAGRAM_ID',
    access_token = 'CORRECT_ENCRYPTED_TOKEN',
    is_active = 1
WHERE account_name = "90's" AND platform = 'instagram'
LIMIT 1;
```

### Via API:
```bash
curl -X POST http://localhost:8000/api/accounts.php \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "instagram",
    "account_name": "90'\''s",
    "account_id": "CORRECT_INSTAGRAM_ID",
    "access_token": "CORRECT_PAGE_TOKEN"
  }'
```

---

## 📊 Current Status

**Working Accounts:**
- ✅ Armario Pro (ID: 17841476214409160)
- ✅ OTC Kompally (ID: 17841453683516805)
- ✅ Bloom Theory Cafe (ID: 17841475296997220)
- ✅ Sorshe (ID: 17841468287822961)

**Not Working:**
- ❌ 90's (ID: 17841473888497604) - Account inactive, may have wrong ID

---

## ⚠️ Common Issues

### Issue 1: "Instagram account not linked"
**Solution:** Link Instagram to Facebook page (see Step 1)

### Issue 2: "Account ID does not exist"
**Solution:** Get the correct ID from Graph API Explorer (see Step 3)

### Issue 3: "Access token invalid"
**Solution:** Use Page Access Token (from `me/accounts`), not User Token

### Issue 4: "Account is Personal, not Business"
**Solution:** Convert to Business/Creator account (see Step 2)

---

## ✅ Verification Checklist

Before testing, verify:
- [ ] Instagram is Business/Creator account
- [ ] Instagram is linked to Facebook page
- [ ] Got Instagram ID from Graph API Explorer
- [ ] Got Page Access Token (not user token)
- [ ] Updated account in dashboard
- [ ] Account is marked as active
- [ ] Tested report generation

---

## 🎯 Expected Result

After fixing, the 90's account should:
- ✅ Appear in account list
- ✅ Generate reports successfully
- ✅ Show followers, posts, reach, engagement data
- ✅ Work just like other accounts

---

**Need help?** Check the Graph API Explorer response - if `instagram_business_account` is missing, the accounts are not linked!
