# 🔑 Where to Get Platform IDs - Complete Guide

## Quick Reference

| Platform | ID Format | Where to Find |
|----------|-----------|---------------|
| **Facebook** | Numeric (9-15 digits) | Page Settings or Graph API |
| **Instagram** | Starts with `17...` (17 digits) | Graph API only |
| **YouTube** | Starts with `UC...` | Channel URL or YouTube Studio |
| **LinkedIn** | Numeric | Company page URL |
| **TikTok** | Numeric or username | Profile settings |

---

## 📘 FACEBOOK PAGE ID

### Method 1: From Facebook Page (Easiest)

**Steps:**
1. Go to your **Facebook Page**
2. Click **"About"** tab (left sidebar)
3. Scroll to the bottom
4. Look for **"Page ID"** or **"Page Transparency"**
5. Copy the number

**Example:** `702416986295139`

---

### Method 2: From Page URL

**If URL shows numbers:**
```
facebook.com/702416986295139
                ↑
        This is your Page ID!
```

**If URL shows page name:**
```
facebook.com/ArmarioPro
             ↑
   Use this as-is, or get numeric ID via Graph API
```

---

### Method 3: Graph API Explorer (Most Reliable)

**Steps:**
1. Go to: https://developers.facebook.com/tools/explorer/
2. Generate access token
3. In query box, enter: `me/accounts`
4. Click **Submit**
5. Find your page in the response:

```json
{
  "data": [
    {
      "id": "702416986295139",  ← Copy this!
      "name": "Armario Pro",
      "access_token": "EAAA..."
    }
  ]
}
```

**Copy the `id` field**

---

## 📸 INSTAGRAM BUSINESS ACCOUNT ID

### Important:
- Instagram IDs are **17 digits** starting with `17...`
- **NOT** your Instagram username
- **NOT** the same as Facebook Page ID
- Only available through Graph API

---

### Method: Via Graph API Explorer (ONLY Way)

**Prerequisites:**
- Instagram must be **Business** or **Creator** account
- Instagram must be **linked to a Facebook Page**

**Steps:**

#### Step 1: Get Facebook Page ID (see above)
```
Example: 702416986295139
```

#### Step 2: Open Graph API Explorer
https://developers.facebook.com/tools/explorer/

#### Step 3: Generate Token
- Click "Generate Access Token"
- Check `instagram_basic` permission
- Generate token

#### Step 4: Query for Instagram ID
In query box, enter (replace with your Page ID):
```
702416986295139?fields=instagram_business_account
```

Click **Submit**

#### Step 5: Copy Instagram ID from Response
```json
{
  "instagram_business_account": {
    "id": "17841405309211844"  ← Copy this!
  },
  "id": "702416986295139"
}
```

**The `instagram_business_account.id` is what you need!**

---

### If No Instagram ID Returns:

**Response shows only:**
```json
{
  "id": "702416986295139"
}
```

**This means:**
- Instagram is NOT linked to this Facebook Page
- Or Instagram is not a Business/Creator account

**Fix:**
1. Open Instagram app
2. Go to **Settings** → **Account** → **Switch to Professional Account**
3. Choose **Business** or **Creator**
4. **Link to Facebook** → Choose the Facebook Page
5. Try query again!

---

## 🎥 YOUTUBE CHANNEL ID

### Method 1: From Channel URL

**If your URL looks like:**
```
youtube.com/channel/UCxxxxxxxxxxxxxxxxxxxx
                    ↑
            Copy everything starting with UC!
```

**Example:** `UCqVDpXKJq9lXxxxxxxxxxxxx`

---

### Method 2: From YouTube Studio

**Steps:**
1. Go to: https://studio.youtube.com
2. Click **Settings** (gear icon)
3. Click **Channel** → **Advanced Settings**
4. Look for **"Channel ID"**
5. Copy the ID (starts with `UC`)

---

### Method 3: From Custom URL

**If you have:**
```
youtube.com/@YourChannelName
```

**Get ID via:**
1. Go to your channel
2. View page source (`Ctrl+U` or `Cmd+Option+U`)
3. Search for `"channelId"`
4. Copy the UC... value

---

## 💼 LINKEDIN COMPANY PAGE ID

### Method 1: From Page URL

**URL format:**
```
linkedin.com/company/12345678/
                     ↑
              This is your Company ID
```

---

### Method 2: Using LinkedIn API

**If you have API access:**
```
GET https://api.linkedin.com/v2/organizations?q=vanityName&vanityName=YOUR_PAGE_NAME
```

Response contains the numeric ID.

---

## 🎵 TIKTOK ACCOUNT ID

### Method 1: Username

**Simply use your TikTok username:**
```
@armario.pro
```

Remove the @ or keep it - both work.

---

### Method 2: Numeric ID

**From TikTok Business API:**
1. Login to TikTok For Business
2. Go to **Assets** → **TikTok Accounts**
3. Click on account
4. Copy the numeric ID shown

---

## 🔍 QUICK FINDER TOOL

### Want to Find All Your IDs at Once?

Use this **Graph API Explorer query** (for Meta platforms):

```
me/accounts?fields=id,name,instagram_business_account{id,username}
```

**This returns:**
- All your Facebook Page IDs
- All Instagram Business Account IDs
- Account names
- Usernames

**One query, all IDs!** ✅

---

## 📋 ID Format Examples

### Facebook Page:
```
✅ 702416986295139
✅ 123456789012345
❌ @armario (this is username, not ID)
❌ facebook.com/armario (this is URL)
```

### Instagram Business:
```
✅ 17841405309211844
✅ 17841405309211845
❌ @armario.pro (username, not ID)
❌ 702416986295139 (this is FB Page ID)
```

### YouTube:
```
✅ UCqVDpXKJq9lXyyyyyyyyyyyy
✅ UC-xxxxxxxxxxxxxxxxxxx
❌ @ChannelName (username)
❌ youtube.com/c/Channel (URL)
```

---

## ⚠️ Common Mistakes

### Mistake 1: Using Username Instead of ID
```
❌ Wrong: @armario.pro
✅ Correct: 17841405309211844
```

### Mistake 2: Using Facebook Page ID for Instagram
```
❌ Wrong: 702416986295139 (Facebook ID)
✅ Correct: 17841405309211844 (Instagram ID)
```

### Mistake 3: Including URL
```
❌ Wrong: facebook.com/702416986295139
✅ Correct: 702416986295139
```

---

## 🎯 What to Enter in Dashboard

### When Adding Account:

**Facebook:**
```
Platform: Facebook
Account Name: Armario Pro
Platform ID: 702416986295139  ← Numeric ID
Access Token: EAAA...
```

**Instagram:**
```
Platform: Instagram  
Account Name: Armario Pro - IG
Platform ID: 17841405309211844  ← 17-digit number
Access Token: EAAA... (same as FB Page token)
```

**YouTube:**
```
Platform: YouTube
Account Name: My Channel
Platform ID: UCqVDpXKJq9lXyyyyyy  ← Starts with UC
Access Token: ya29...
```

---

## 🚀 Fastest Way to Get All IDs

### For Meta Platforms (FB + IG):

**One Query Gets Everything:**

1. **Graph API Explorer**: https://developers.facebook.com/tools/explorer/
2. **Generate token** with permissions
3. **Query:**
   ```
   me/accounts?fields=id,name,instagram_business_account{id,username}
   ```
4. **Submit**
5. **Copy all IDs** from response:
   - Facebook Page IDs → `id` field
   - Instagram IDs → `instagram_business_account.id`

**Example Response:**
```json
{
  "data": [
    {
      "id": "702416986295139",  ← Facebook Page ID
      "name": "Armario Pro",
      "instagram_business_account": {
        "id": "17841405309211844",  ← Instagram ID
        "username": "armario.pro"
      }
    },
    {
      "id": "674273839102953",  ← Another Facebook Page
      "name": "Tecora Restaurant",
      // No Instagram linked to this page
    }
  ]
}
```

**One query = All your IDs!** ⚡

---

## 💡 Pro Tips

### Tip 1: Save IDs in Spreadsheet
Keep a master list:
| Client | Platform | Platform ID | Token Updated | Notes |
|--------|----------|-------------|---------------|-------|
| Armario | Facebook | 702416... | 2024-11-05 | Active |
| Armario | Instagram | 17841... | 2024-11-05 | Linked to FB |

### Tip 2: Verify ID Format
- Facebook: Just numbers
- Instagram: Starts with `17`
- YouTube: Starts with `UC`

### Tip 3: Test Before Adding
In Graph API Explorer:
```
{PAGE_ID}?fields=name,fan_count
```
If it returns data → ID is correct! ✅

---

## 🆘 Troubleshooting

### "Object does not exist" Error
- ❌ Wrong ID format
- ❌ ID doesn't belong to you
- ❌ Token doesn't have access

**Solution:** Verify ID using `me/accounts` query

### Instagram ID Not Found
- ❌ Instagram not linked to FB Page
- ❌ Not a Business/Creator account

**Solution:** Link IG to FB Page first

### Can't Find YouTube ID
- Look in **YouTube Studio** → Settings → Advanced
- Or use channel URL method

---

## ✅ Summary

**Facebook Page ID:**
- Page Settings → About → Page ID
- Or Graph API: `me/accounts` → `id`

**Instagram Business ID:**
- Graph API ONLY: `PAGE_ID?fields=instagram_business_account`
- Copy `instagram_business_account.id`

**YouTube Channel ID:**
- Channel URL or YouTube Studio
- Starts with `UC`

---

## 🔗 Quick Links

- **Graph API Explorer**: https://developers.facebook.com/tools/explorer/
- **YouTube Studio**: https://studio.youtube.com
- **Facebook Pages**: https://www.facebook.com/pages/

---

**Need help finding a specific ID? Just ask and I'll walk you through it!** 🔍✨

