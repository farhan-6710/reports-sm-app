# 🔧 Instagram Insights Troubleshooting Guide

## ❌ Problem: Reach & Impressions Still Showing 0

Even though you have `instagram_manage_insights` permission checked, the data is still 0. Let's diagnose and fix this!

---

## 🎯 Quick Diagnosis Tool

### Step 1: Run Diagnostic Test

**Open in browser:**
```
http://localhost:8000/test_instagram_insights.php?account_id=17841476214409160&access_token=YOUR_TOKEN
```

**Replace:**
- `17841476214409160` = Your Armario Pro Instagram ID
- `YOUR_TOKEN` = Your current access token

**This will show:**
- ✅ or ❌ for each API call
- Exact error messages from Instagram API
- Which permissions are actually granted
- Specific diagnosis of the problem

---

## 🔍 Common Causes & Solutions

### Cause 1: Wrong Token Type ⚠️  **MOST COMMON**

**Problem:**
You're using a **User Access Token** instead of a **Page Access Token**

**How to Check:**
- User tokens start with: `EAA...` (generic)
- Page tokens also start with: `EAA...` but are tied to a specific page

**Solution:**
```
1. Graph API Explorer
2. Generate token with permissions
3. DON'T use the token from the top panel!
4. Instead, run query: me/accounts
5. Find your page in results
6. Copy the "access_token" from INSIDE the response
7. That's the PAGE token - use that one!
```

**Example:**
```json
// Query: me/accounts

{
  "data": [
    {
      "id": "702416986295139",
      "name": "Armario Pro",
      "access_token": "EAAxxxx123456"  ← USE THIS TOKEN!
      // NOT the token from the top panel
    }
  ]
}
```

---

### Cause 2: Permission Not Actually Granted

**Problem:**
Permission is "checked" in Graph API Explorer but not actually granted to the token

**How to Check:**
Run diagnostic: http://localhost:8000/test_instagram_insights.php
Look at `test4_token_permissions` section

**Solution:**
```
1. Graph API Explorer
2. Click "Get User Access Token" (not Generate Access Token)
3. In permissions popup:
   ✅ instagram_basic
   ✅ instagram_manage_insights
   ✅ pages_show_list
   ✅ pages_read_engagement
4. Click "Get Access Token"
5. Authorize
6. THEN get page token via me/accounts
7. Update in dashboard
```

---

### Cause 3: Instagram Account Type

**Problem:**
Account is Personal, not Business/Creator

**How to Check:**
```
Query in Graph API Explorer:
17841476214409160?fields=username,account_type

If you get an error or account_type is not "BUSINESS", that's the issue
```

**Solution:**
```
Instagram App:
Settings → Account → Switch to Professional Account
Choose: Business Account
Complete setup
Re-link to Facebook Page
```

---

### Cause 4: App Not in Advanced Access

**Problem:**
Your app needs "Advanced Access" for `instagram_manage_insights`

**How to Check:**
```
1. developers.facebook.com
2. Your App → App Settings → Advanced Access
3. Look for "instagram_manage_insights"
4. If it says "Standard Access" - that's the problem
```

**Solution:**
```
Option A: Use Graph API Explorer app (already has Advanced Access)
  1. In Graph API Explorer dropdown
  2. Select "Graph API Explorer" as the app
  3. Generate token with that app
  4. Use that token

Option B: Request Advanced Access for your app
  1. App → Advanced Access
  2. Find "instagram_manage_insights"
  3. Click "Request Advanced Access"
  4. Submit for review (takes 1-2 days)
```

---

### Cause 5: Token Generated from Wrong App

**Problem:**
Using token from "SM Analytics 2" which might not have permissions

**Solution:**
```
In Graph API Explorer:
1. Top dropdown: "Meta App"
2. Change to: "Graph API Explorer" (built-in app)
3. Generate token with that app
4. This app has all permissions already approved
```

---

### Cause 6: API Version Too Old/New

**Problem:**
Instagram API behavior changed between versions

**Solution:**
I've updated the code to use v18.0, but you can also try:
- v19.0 (latest)
- v17.0 (more stable)

**To change:**
Edit `backend/services/InstagramService.php`
Line 59, 77, 103, 175: Change `v18.0` to `v19.0`

---

## 🚀 Step-by-Step Fix (Most Likely Solution)

### The Problem is Usually: Using Wrong Token

**Follow these EXACT steps:**

### Step 1: Open Graph API Explorer
```
https://developers.facebook.com/tools/explorer/
```

### Step 2: Select Correct App
```
Top dropdown (Meta App): Select "Graph API Explorer"
(NOT "SM Analytics 2")
```

### Step 3: Generate Token with Permissions
```
Click: "Generate Access Token"

Check these boxes:
✅ instagram_basic
✅ instagram_manage_insights
✅ pages_show_list
✅ pages_read_engagement
✅ read_insights

Click: "Generate Token"
Authorize: Allow all
```

### Step 4: Get PAGE Token (Important!)
```
In the query box, enter:
me/accounts?fields=id,name,access_token,instagram_business_account

Click: Submit

Find: "Armario Pro" in results

Copy: The "access_token" from the JSON response
(NOT the token showing in the top panel!)

Example response:
{
  "data": [
    {
      "id": "702416986295139",
      "name": "Armario Pro",
      "access_token": "EAAQOZAaHvqLUBO..." ← COPY THIS!
    }
  ]
}
```

### Step 5: Test the Token
```
1. Keep Graph API Explorer open
2. Paste the PAGE token into the "Access Token" field at top
3. Query:
   17841476214409160/insights?metric=impressions,reach&period=day

4. Click Submit

If you see data = Token works! ✅
If you see error = See diagnosis below
```

### Step 6: Update in Dashboard
```
http://localhost:8000

MANAGE ACCOUNTS
Edit: Armario Pro - Instagram
Access Token: [paste the PAGE token]
Update Account
```

### Step 7: Generate Report
```
Dashboard
Select: Armario Pro - Instagram
Generate Report
Check: Reach & Impressions should now show numbers!
```

---

## 🔬 Diagnostic Commands

### Test 1: Check Token Permissions
```
http://localhost:8000/test_instagram_insights.php?account_id=17841476214409160&access_token=YOUR_TOKEN
```

Look for:
- `test4_token_permissions.status`
- Should say: "✅ ALL PERMISSIONS GRANTED"

### Test 2: Test Account Insights API
```
Graph API Explorer:

Query:
17841476214409160/insights?metric=impressions,reach,profile_views&period=day&since=1696118400&until=1698796800

If successful: You'll see data with values
If fails: Check error message
```

### Test 3: Test Media Insights API
```
Graph API Explorer:

Step 1 - Get recent media:
17841476214409160/media?fields=id,timestamp&limit=1

Step 2 - Test insights for that media:
{MEDIA_ID}/insights?metric=impressions,reach,engagement

If this works but account insights don't:
→ Your token has partial permissions
→ Can get post-level data but not account-level
```

---

## 📊 What Should Work vs What Requires Permissions

### ✅ Works WITHOUT instagram_manage_insights:
- Username, name
- Follower count
- Media count (number of posts)
- Like count (per post)
- Comment count (per post)
- Media URLs, captions

### ⚠️  Requires instagram_manage_insights:
- **Reach** (account-level)
- **Impressions** (account-level)
- **Profile views**
- **Website clicks**
- Media reach (per post)
- Media impressions (per post)

---

## 🎯 Expected Results After Fix

### Before Fix:
```json
{
  "followers": 190,
  "posts_count": 17,
  "engagement": 73,
  "reach": 0,           ← Problem!
  "impressions": 0,     ← Problem!
  "profile_views": 0    ← Problem!
}
```

### After Fix:
```json
{
  "followers": 190,
  "posts_count": 17,
  "engagement": 73,
  "reach": 2450,        ← Now shows data!
  "impressions": 5120,  ← Now shows data!
  "profile_views": 156  ← Now shows data!
}
```

---

## 💡 Alternative: If API Still Fails

### Fallback Option: Media-Level Insights

**Even if account-level insights fail, we can get post-level data!**

The updated code tries:
1. Account-level insights (best, but requires permissions)
2. Media-level insights (sum of recent posts)
3. Falls back to 0 if both fail

**Media insights usually work with just `instagram_basic`**

---

## 🔑 Token Comparison

### User Access Token (Wrong):
```
Generated from: Top panel in Graph API Explorer
Use for: Initial queries
Problem: Won't have page-specific permissions
Result: Insights fail ❌
```

### Page Access Token (Correct):
```
Generated from: me/accounts query
Use for: All page/Instagram API calls
Benefit: Has page-level permissions
Result: Insights work ✅
```

---

## 📞 Need More Help?

### Run Full Diagnostic:
```bash
# Test your current setup
http://localhost:8000/test_instagram_insights.php?account_id=17841476214409160&access_token=YOUR_CURRENT_TOKEN

# Check each section:
# - test1_account_info (should be ✅)
# - test2_account_insights (if ❌, read diagnosis)
# - test3_media_insights (fallback option)
# - test4_token_permissions (shows what's missing)
```

### Common Error Messages & Fixes:

**"Permissions error"**
→ Token missing `instagram_manage_insights`
→ Regenerate token with permission checked

**"Object does not exist"**
→ Wrong Instagram ID or not Business account
→ Verify ID via `me/accounts` query

**"Invalid OAuth access token"**
→ Token expired or malformed
→ Generate fresh token

**"Cannot be loaded"**
→ Account not linked to Page
→ Link Instagram to Facebook Page in Instagram app

---

## ✅ Checklist

Before asking for help, verify:
- [ ] Instagram account is Business/Creator (not Personal)
- [ ] Instagram linked to Facebook Page
- [ ] You're admin of that Facebook Page
- [ ] Token generated with `instagram_manage_insights` checked
- [ ] Using PAGE token (from me/accounts), not user token
- [ ] Token tested in Graph API Explorer and works
- [ ] Diagnostic test run and reviewed
- [ ] Token updated in dashboard
- [ ] Report regenerated after token update

---

**Most issues are solved by using the correct PAGE ACCESS TOKEN from me/accounts query!** 🔑✨

**Run the diagnostic tool to see exactly what's wrong with your current setup!**

