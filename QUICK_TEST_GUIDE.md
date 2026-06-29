# Quick Test Guide - Instagram Analytics Fix

## Immediate Testing Steps

### 1. Test API Endpoint Directly

Open in browser or use curl:
```
http://localhost:8000/api/test_instagram_api.php?account_id=17841408769245289
```

This will test:
- ✅ Account info retrieval
- ✅ Account insights (batch and individual)
- ✅ Media retrieval
- ✅ Media insights

### 2. Test with Your Token

Replace `YOUR_TOKEN` with the provided token:
```
http://localhost:8000/api/test_instagram_api.php?account_id=17841408769245289&token=YOUR_TOKEN
```

### 3. Test Account IDs

Try different account IDs:
- `17841408769245289` - malnadukitchen
- `17841417697310086` - alaterracelounge
- `17841417527669773` - kulture_sportsbar
- `17841453683516805` - otc.kompally

### 4. Check Server Logs

Look for these log messages:
```
Fetching Instagram insights for account [ID] (date range: [START] to [END])
Instagram metric 'impressions' fetched successfully: [VALUE]
Instagram metric 'reach' fetched successfully: [VALUE]
Available Instagram insights: ["impressions", "reach", ...]
```

### 5. Test Full Report Generation

1. Go to frontend: `http://localhost:3000`
2. Select an Instagram account
3. Click "Generate Report"
4. Check if data appears (should see real numbers, not zeros)

## Expected Results

### ✅ Success Indicators

- Test script returns JSON with `success: true`
- Account insights show real numbers (not all zeros)
- Server logs show "fetched successfully" messages
- Frontend displays actual engagement metrics

### ❌ Failure Indicators

- Test script shows `success: false`
- Error messages about permissions (code 10)
- All metrics return null or 0
- "Empty response" errors

## Common Issues & Solutions

### Issue: Permission Errors (Code 10)
**Solution**: Token needs `instagram_manage_insights` permission. Regenerate token with correct permissions.

### Issue: Empty Data
**Solution**: 
1. Check if account has activity in the date range
2. Verify account is Instagram Business/Creator
3. Check if account is connected to Facebook Page

### Issue: API Version Errors
**Solution**: Already fixed - all calls now use v19.0

### Issue: Rate Limiting
**Solution**: 
- Batch API calls are now used (fewer requests)
- If still hitting limits, add delays between requests

## Verification Checklist

- [ ] Test script runs without errors
- [ ] Account info returns username and followers
- [ ] Account insights return at least some metrics
- [ ] Media list returns posts
- [ ] Frontend report shows real data
- [ ] Server logs show successful API calls
- [ ] No permission errors in logs

## Next Steps After Testing

1. If test script works → Frontend should work
2. If test script fails → Check token permissions
3. If some metrics work but others don't → Normal (depends on account activity)
4. If all metrics are null → Check account type and permissions

## Debugging Commands

### Check PHP Error Logs
```bash
# Windows
type C:\path\to\php\error.log

# Linux/Mac
tail -f /var/log/php/error.log
```

### Test Individual API Call
```bash
curl "https://graph.facebook.com/v19.0/17841408769245289/insights?metric=impressions,reach&period=day&since=1704067200&until=1704153600&access_token=YOUR_TOKEN"
```

### Verify Token Permissions
```bash
curl "https://graph.facebook.com/v19.0/me/permissions?access_token=YOUR_TOKEN"
```

## Support

If issues persist:
1. Check `INSTAGRAM_ANALYTICS_FIX_SUMMARY.md` for detailed explanation
2. Review server error logs
3. Verify token has all required permissions
4. Test with different account IDs to isolate the issue

















