# Local Testing Guide - Instagram Insights Fix

## ✅ Server Status

The PHP server should be running on: `http://localhost:8000`

## 🧪 Testing Methods

### Method 1: Browser UI (Easiest)

1. Open your browser and go to:
   ```
   http://localhost:8000/api/test_instagram_ui.html
   ```

2. Enter your access token and account ID
3. Click "Run Tests"
4. View results in the UI

### Method 2: Direct API Call

Open in browser or use curl:
```
http://localhost:8000/api/test_instagram_local.php?token=YOUR_TOKEN&account_id=17841408769245289&days=7
```

Replace:
- `YOUR_TOKEN` with your Instagram access token
- `17841408769245289` with your Instagram account ID (optional, this is default)
- `7` with number of days (optional, default is 7)

### Method 3: Using curl (Command Line)

```bash
curl "http://localhost:8000/api/test_instagram_local.php?token=YOUR_TOKEN&account_id=17841408769245289&days=7"
```

### Method 4: Using PowerShell

```powershell
$token = "YOUR_TOKEN"
$accountId = "17841408769245289"
$days = 7
$url = "http://localhost:8000/api/test_instagram_local.php?token=$token&account_id=$accountId&days=$days"
Invoke-WebRequest -Uri $url | Select-Object -ExpandProperty Content
```

## 📋 Test Accounts

Use these Instagram Business Account IDs for testing:

- `malnadukitchen`: `17841408769245289`
- `alaterracelounge`: `17841417697310086`
- `kulture_sportsbar`: `17841417527669773`

## 🔑 Getting a Valid Access Token

1. Go to [Graph API Explorer](https://developers.facebook.com/tools/explorer/)
2. Select your app
3. Click "Generate Access Token"
4. Select permissions:
   - `instagram_basic`
   - `instagram_manage_insights`
   - `pages_show_list`
   - `pages_read_engagement`
5. Generate token
6. Copy the token

**Note:** User tokens expire in 1-2 hours. For long-term use:
- Exchange for long-lived token (60 days)
- Or get Page Token (never expires)

## ✅ Expected Results

When tests pass, you should see:

1. **Account Info**: ✅ SUCCESS
   - Username
   - Followers count
   - Media count

2. **Account Insights**: ✅ SUCCESS
   - Reach (may be null if no activity)
   - Profile views (may be null)
   - Website clicks (may be null)
   - Total interactions (may be null)

3. **Recent Media**: ✅ SUCCESS
   - List of recent posts
   - Like counts
   - Comment counts

4. **Full Account Insights**: ✅ SUCCESS
   - Complete organic metrics
   - Total views from posts
   - Total likes/comments
   - Real data (not zeros)

## 🐛 Troubleshooting

### Server Not Running

Start the server:
```bash
cd social_media_report/backend
php -S localhost:8000 router.php
```

### Token Expired

Error: `Session has expired`
- Generate a new token from Graph API Explorer
- Use the new token in your test

### No Data Returned

If metrics are `null` or `0`:
- Check date range - try last 30 or 90 days
- Verify account has activity in that period
- Some metrics may not be available for all accounts

### CORS Errors

If testing from a different origin:
- The API already includes CORS headers
- Should work from any origin

## 📊 What Was Fixed

1. ✅ Removed invalid `impressions` from account-level insights
2. ✅ Added `metric_type=total_value` for required metrics
3. ✅ Replaced `impressions` with `views` for media insights
4. ✅ Replaced `engagement` with `total_interactions`
5. ✅ Fixed metric usage for different content types

## 🎯 Success Criteria

Tests are successful when:
- ✅ All 4 test sections show "SUCCESS"
- ✅ `has_real_data` is `true`
- ✅ At least one metric has a non-zero value
- ✅ No API errors in response

## 📝 Sample Successful Response

```json
{
  "status": "completed",
  "tests": {
    "account_info": {
      "status": "SUCCESS",
      "username": "malnadukitchen",
      "followers": 1234
    },
    "account_insights": {
      "status": "SUCCESS",
      "has_reach": true,
      "metrics_summary": {
        "reach": 500,
        "profile_visits": 100
      }
    },
    "full_account_insights": {
      "status": "SUCCESS",
      "has_real_data": true,
      "organic": {
        "total_views": 5000,
        "total_likes": 200
      }
    }
  },
  "summary": {
    "all_tests_passed": true,
    "has_real_data": true
  }
}
```

















