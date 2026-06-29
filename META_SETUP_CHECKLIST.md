# Meta / Graph API Setup — Complete Checklist

## 12-Step Professional Setup Guide

---

## ✅ Step 1: Create the App (Business Type)

### Actions:
1. Go to **Meta for Developers** → **My Apps** → **Create App**
2. Choose **Business** type
3. Name your app: "Social Media Analytics"

### Add These Products:
- ✅ **Facebook Login for Business** (OAuth authentication)
- ✅ **Instagram Graph API** (organic IG data)
- ✅ **Webhooks** (real-time notifications)
- ✅ **Marketing API** (paid ads data)

### Configure Settings → Basic:
- App Domains: `yourapp.com`
- Privacy Policy URL: `https://yourapp.com/privacy`
- User Data Deletion URL: `https://yourapp.com/data-deletion`

**Status:** [ ] Complete

---

## ✅ Step 2: Prepare Instagram & Facebook Assets

### Requirements:
1. ✅ Instagram accounts must be **Professional** (Business/Creator)
2. ✅ Link each IG account to its **Facebook Page** (required for insights)
3. ✅ Business Manager owns/has access to:
   - Facebook Pages
   - Instagram accounts
   - Ad Accounts

### How to Link:
- Instagram app → Settings → Account → Linked accounts → Facebook
- Choose the Facebook Page to link

**Status:** [ ] Complete

---

## ✅ Step 3: Configure Facebook Login (OAuth)

### Settings:
**Products → Facebook Login → Settings**

Add **Valid OAuth Redirect URIs:**
```
https://api.yourapp.com/auth/meta/callback
http://localhost:8000/auth/meta/callback (development)
```

### For Testing:
Use **Graph API Explorer** to generate short-lived tokens for testing

**Status:** [ ] Complete

---

## ✅ Step 4: Add Instagram Graph API & Webhooks

### Instagram Graph API:
1. Go to **Instagram Graph API** → **Quickstart**
2. Confirm app can see professional IG accounts via linked Pages
3. Test with Graph API Explorer

### Webhooks:
1. **Webhooks → Subscriptions**
2. Add topics:
   - Instagram: `comments`, `mentions`, `feed`
   - Page: `feed`, `comments`, `messages`
3. Point to: `https://api.yourapp.com/webhooks/meta`
4. Implement verification endpoint

**Status:** [ ] Complete

---

## ✅ Step 5: Request Permissions (Advanced Access)

### Required Scopes:

**For Organic Data (Facebook Pages):**
- ✅ `pages_read_engagement`
- ✅ `pages_read_user_content`
- ✅ `read_insights`
- ✅ `pages_show_list`

**For Organic Data (Instagram):**
- ✅ `instagram_basic`
- ✅ `instagram_manage_insights`

**For Paid/Inorganic Data (Ads):**
- ✅ `ads_read` (Marketing API Insights)

**NOT Needed (unless creating ads):**
- ❌ `ads_management` (only if creating/managing ads)

### How to Request:
**App Dashboard → App Review → Permissions & Features** → Request Advanced Access

**Status:** [ ] Complete

---

## ✅ Step 6: Choose Token Model

### Option A: MVP (Fastest - Start Here)
1. Use **Facebook Login** to get User Access Token
2. Exchange for **Long-Lived User Token** (~60 days)
3. Fetch **Page Tokens** (never expire!)
4. Use Page tokens server-side

### Option B: Production/Agency Scale (Recommended Later)
1. Create **System User** in Business Manager
2. Assign assets (Pages, Ad Accounts)
3. Generate **System User Access Token**
4. No human re-auth needed
5. Can be rotated securely

**Current Choice:** [ ] MVP or [ ] System User

**Status:** [ ] Complete

---

## ✅ Step 7: App Review — Pass Smoothly

### Required Materials:
1. **Screencast** showing:
   - Login flow
   - Connecting Page/IG
   - Read-only dashboards
   
2. **Test Credentials**:
   - Reviewer login credentials
   - Sample Page/IG account access

3. **Documentation**:
   - Usage notes
   - Data handling description
   - Matches privacy policy

### Submit:
**App Review → Permissions & Features** → Provide materials

**Status:** [ ] Complete

---

## ✅ Step 8: Enable Marketing API (Paid Insights)

### Setup:
1. **App Dashboard** → **Marketing API** → **Tools**
2. Confirm app can query Insights on ad account
3. Test with ad account you own/have access to

### Rate Limits:
- Use breakdowns sparingly (`publisher_platform`, `age`, `gender`)
- Some breakdowns are rate-limited or restricted

**Status:** [ ] Complete

---

## ✅ Step 9: Webhooks — Verification & Subscription

### Implement Verification:
When Meta calls your endpoint with `hub.mode=subscribe`:
1. Verify `hub.verify_token` matches your secret
2. Reply with `hub.challenge`

### Subscribe To:
**Instagram Fields:**
- `comments`
- `mentions`
- `feed`

**Page Fields:**
- `feed`
- `comments`
- `messages`

Configure in: **App Dashboard → Webhooks**

**Status:** [ ] Complete

---

## ✅ Step 10: Test Calls

### Test These Endpoints:

**Pages Insights (daily):**
- Requires: `read_insights` + Page token
- Test: `PAGE_ID/insights?metric=page_impressions`

**IG User/Media Insights:**
- Requires: `instagram_manage_insights`
- Test: `IG_USER_ID/insights?metric=impressions`

**Ad Account Insights:**
- Requires: `ads_read`
- Test: `act_AD_ACCOUNT_ID/insights`

Use **Graph API Explorer** to verify before coding

**Status:** [ ] Complete

---

## ✅ Step 11: Common Pitfalls to Avoid

### ⚠️ Watch Out For:

1. **IG Must Be Professional + Linked to Page**
   - Check linkage if calls fail
   - Instagram Business/Creator required

2. **Scopes vs. Mode**
   - If app is Live but scope not approved → "Invalid Scopes" error
   - Test in Development mode first

3. **Rate Limits & Breakdowns**
   - Reach-related metrics limited with certain breakdowns
   - Don't over-request granular data

4. **Token Expiration**
   - User tokens: 1-2 hours
   - Long-lived: 60 days
   - Page tokens: Never expire (use these!)

**Status:** [ ] Understood

---

## ✅ Step 12: Done Checklist

### Before You Start Coding:

- [ ] Business-type app created
- [ ] Login, IG Graph, Webhooks products added
- [ ] Privacy Policy + Data-Deletion pages live
- [ ] Pages/IG accounts owned/linked in Business Manager
- [ ] Ad accounts connected
- [ ] Requested scopes from Step 5
- [ ] (Eventually) Approved for required scopes
- [ ] Token strategy selected (MVP long-lived or System User)
- [ ] Webhooks endpoint verified and subscribed
- [ ] Test calls for Page/IG/Ads insights succeed in Graph API Explorer

---

## 🚀 Ready to Code!

Once all checkboxes above are ✅, you're ready for:
1. PHP OAuth implementation
2. Webhook verifier
3. API integration layer
4. React frontend connection

---

## 📋 Quick Reference

### Token Types:
| Type | Duration | Use Case |
|------|----------|----------|
| User Token | 1-2 hours | Testing only |
| Long-Lived User | 60 days | Development |
| Page Token | Never expires | ✅ Production |
| System User | Rotatable | ✅ Agency scale |

### Essential Endpoints:
```
# Get Pages
GET /me/accounts

# Get IG Account
GET /{page-id}?fields=instagram_business_account

# Page Insights
GET /{page-id}/insights?metric=...&period=day

# IG Insights
GET /{ig-user-id}/insights?metric=...&period=day

# Ad Insights
GET /act_{ad-account-id}/insights
```

---

**Status:** Setup [ ] Complete | Coding [ ] Ready

