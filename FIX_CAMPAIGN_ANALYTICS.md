# 🔧 Fix Campaign Analytics - Ads Permission Error

## ⚠️ Current Error

```
(#200) Ad account owner has NOT grant ads_management or ads_read permission
```

**This means:** The access token being used doesn't have permission to access Facebook Ads data.

---

## ✅ Solution: Get Token with Ads Permissions

### Step 1: Get Ads Access Token

#### Option A: Graph API Explorer (Recommended)

1. **Go to:** https://developers.facebook.com/tools/explorer/

2. **Select App:**
   - Top dropdown: Select **"Graph API Explorer"** (not your custom app)
   - This app has all permissions pre-approved

3. **Generate Token:**
   - Click **"Generate Access Token"**
   - In permissions popup, check:
     - ✅ `ads_read` (REQUIRED)
     - ✅ `ads_management` (optional, but recommended)
     - ✅ `business_management` (helps with ad accounts)
   - Click **"Generate Token"**
   - Authorize all permissions

4. **Copy Token:**
   - Copy the token from the **top panel** (this is a user token, which is correct for ads)

#### Option B: Marketing API Tools

1. **Go to:** https://developers.facebook.com/apps/
2. **Select your app** (or create one)
3. **Go to:** Tools → Marketing API
4. **Click:** "Get Token" button
5. **Select permissions:**
   - ✅ `ads_read`
   - ✅ `ads_management`
6. **Copy the token**

---

### Step 2: Verify Token Has Access to Ad Account

**In Graph API Explorer**, with your new token:

1. **Query your ad accounts:**
   ```
   me/adaccounts?fields=id,name,account_id,currency,account_status
   ```

2. **Check the response:**
   - You should see your ad accounts listed
   - Find the one you want (e.g., "OTC Kompally")
   - Note the `account_id` (without `act_` prefix)

3. **If you DON'T see your ad account:**
   - The token user doesn't have access to that ad account
   - You need to:
     - Use a token from the ad account owner, OR
     - Have the owner grant you access in Business Manager

---

### Step 3: Update Ad Account in Dashboard

1. **Go to:** http://localhost:3000/campaigns

2. **Click:** "Manage Ad Accounts" button (top right)

3. **Find your ad account** (e.g., "OTC Kompally")

4. **Click:** Edit/Update button

5. **Update Access Token:**
   - Paste the new token with `ads_read` permission
   - Click "Update" or "Save"

6. **OR Add New Ad Account:**
   - Client Name: OTC Kompally
   - Ad Account ID: `1389344766087270` (without `act_`)
   - Access Token: [Paste your new token]
   - Currency: INR
   - Click "Add Ad Account"

---

### Step 4: Test Campaign Analytics

1. **Go to:** Campaign Analytics page
2. **Select:** Your ad account from dropdown
3. **Select:** Date range
4. **Click:** Generate Report
5. **Should work now!** ✅

---

## 🔍 Troubleshooting

### Issue 1: "Ad account not found"

**Solution:**
- Verify the Ad Account ID is correct (numbers only, no `act_` prefix)
- Check the account exists in your Facebook Ads Manager
- Ensure you're using the correct account ID

### Issue 2: "Token doesn't have access to this ad account"

**Solution:**
- The token must be from a user who has access to the ad account
- Check in Business Manager: Settings → People → Ad Account Roles
- Ensure the token user is listed with access

### Issue 3: "Permission denied even with ads_read"

**Solution:**
- Make sure you're using a **User Access Token** (not Page Token)
- For ads, user tokens work, page tokens don't
- Regenerate token with `ads_read` permission checked

### Issue 4: "Can't see ad accounts in Graph API Explorer"

**Solution:**
- The user whose token you're using must have access to ad accounts
- Check: `me/adaccounts` should return your ad accounts
- If empty, the user doesn't have any ad accounts or access

---

## 📊 Current Ad Accounts in Database

Based on your database:

1. **OTC Kompally**
   - Ad Account ID: `17841453683516805`
   - Status: Inactive
   - **Needs:** Token with `ads_read` permission

2. **Armario**
   - Ad Account ID: `1389344766087270`
   - Status: Active
   - **Needs:** Verify token has `ads_read` permission

---

## ✅ Quick Fix Command

If you have the correct token, you can update via SQL:

```sql
-- Update OTC Kompally ad account
UPDATE ad_accounts 
SET access_token = 'YOUR_NEW_TOKEN_WITH_ADS_READ',
    status = 'active',
    last_checked = NOW()
WHERE ad_account_id = '17841453683516805';

-- Update Armario ad account  
UPDATE ad_accounts 
SET access_token = 'YOUR_NEW_TOKEN_WITH_ADS_READ',
    status = 'active',
    last_checked = NOW()
WHERE ad_account_id = '1389344766087270';
```

**Note:** Tokens should be encrypted before storing. Use the dashboard to update properly.

---

## 🎯 Expected Result

After updating with correct token:

- ✅ Campaign Analytics page loads
- ✅ Ad account dropdown shows accounts
- ✅ Can select account and generate reports
- ✅ Campaign data displays correctly
- ✅ Metrics show: Spend, Impressions, Clicks, etc.

---

## 📝 Summary

**Problem:** Access tokens missing `ads_read` permission

**Solution:** 
1. Get new token with `ads_read` permission from Graph API Explorer
2. Update ad account in dashboard with new token
3. Test campaign analytics

**Key Point:** For Facebook Ads API, you need a **User Access Token** with `ads_read` permission, NOT a Page Token.

---

**Need help?** Check that your token works by testing in Graph API Explorer first:
```
me/adaccounts?fields=id,name,account_id
```

If this works, your token is good! ✅
