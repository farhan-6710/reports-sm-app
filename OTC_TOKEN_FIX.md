# 🔧 OTC Kompally - Get Reach & Impressions Working

## ❌ Current Problem

Your OTC token has **ZERO permissions** - that's why reach and impressions show as 0.

**Diagnostic shows:**
- ✅ Account info works (3,240 followers!)
- ❌ Insights fail - "missing permissions"
- ❌ Token has 0 granted permissions

---

## ✅ Solution: Get Correct PAGE Token for OTC

### Step 1: Graph API Explorer Setup

**Go to:** https://developers.facebook.com/tools/explorer/

**CRITICAL Settings (Before generating token):**
```
Meta App: Graph API Explorer (NOT "SM Analytics 2")
User or Page: Me / Mohan Krishna (NOT "OTC Kompally")
```

---

### Step 2: Generate Token with Permissions

**Click:** "Generate Access Token"

**Check these boxes:**
```
✅ pages_show_list
✅ pages_read_engagement
✅ instagram_basic
✅ instagram_manage_insights
✅ read_insights
```

**Click:** "Generate Access Token"

**Authorize:** Select ALL pages

---

### Step 3: Get OTC PAGE Token

**Query:**
```
me/accounts?fields=id,name,access_token,instagram_business_account{id,username}
```

**Click Submit**

**Find OTC Kompally in response:**
```json
{
  "data": [
    {
      "id": "FACEBOOK_PAGE_ID",
      "name": "OTC Kompally" or similar,
      "access_token": "EAAxxxx...",  ← COPY THIS!
      "instagram_business_account": {
        "id": "17841453683516805",
        "username": "otc.kompally"
      }
    }
  ]
}
```

**Copy the `access_token` from inside the OTC page object!**

---

### Step 4: Test the New Token

**Before updating dashboard:**
```
http://localhost:8000/test_instagram_insights.php?account_id=17841453683516805&access_token=NEW_TOKEN_HERE
```

**Should show:**
- ✅ test1: SUCCESS
- ✅ test2: SUCCESS (reach data!)
- ✅ test4: ALL PERMISSIONS GRANTED

---

### Step 5: Update Dashboard

```
1. http://localhost:3000
2. MANAGE ACCOUNTS
3. Find: OTC Kompally - Instagram
4. Click: Edit (✏️)
5. Paste: NEW PAGE token
6. Save
```

---

### Step 6: Generate Report

```
1. Select: OTC Kompally - Instagram
2. Click: Generate Report
3. See: Real reach data! 🎉
```

---

## 📊 What You'll Get

### With Correct Token:

```json
{
  "username": "otc.kompally",
  "followers": 3240,
  "posts": 534,
  "engagement": [calculated from posts],
  "reach": 15000+,  ← Now shows data!
  "profile_views": 500+,  ← Now shows data!
  "website_clicks": 50+  ← Now shows data!
}
```

---

## ⚠️ Important Notes

### About Impressions:

**Instagram Account-Level Insights:**
- ✅ Reach (available)
- ❌ Impressions (NOT available at account level)
- ✅ Profile views (available)
- ✅ Website clicks (available)

**Instagram changed their API** - impressions is only available:
- Per-post (requires individual API call per post - too slow)
- Or use reach as a proxy metric

### What You'll See in Reports:

```
✅ Reach: Actual number
⚠️  Impressions: 0 (not available from Instagram API)
✅ Profile Views: Actual number  
✅ Website Clicks: Actual number
```

---

## 🎯 Quick Summary

**Problem:** OTC token has no permissions  
**Fix:** Get PAGE token from `me/accounts` with permissions checked  
**Result:** Reach and other metrics will populate  
**Note:** Impressions not available (Instagram API limitation)

---

## 💡 Why Your Current Token Doesn't Work

**Current OTC token:**
- Has 0 permissions
- Probably copied from wrong place
- Or generated without checking permission boxes
- Or using user token instead of page token

**Correct token:**
- From `me/accounts` query response
- Has all Instagram permissions
- Specific to OTC Kompally page
- Works for insights API

---

## 🚀 Do This Now

1. **Graph API Explorer** → Select "Graph API Explorer" app
2. **User/Page** → Select "Me" (not a page)
3. **Generate token** → Check all 5 permissions
4. **Query** → `me/accounts`
5. **Find OTC** → Copy its access_token
6. **Test** → Run diagnostic
7. **Update** → Paste in dashboard
8. **Generate** → See reach data! ✅

---

**The token you used for OTC doesn't have any permissions. Follow the steps above to get a proper PAGE token and reach will populate!** 🔑✨

