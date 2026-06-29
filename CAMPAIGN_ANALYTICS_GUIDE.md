# 💰 Campaign Analytics - Complete Guide

## ✅ Multi-Currency Support Added!

Your campaign reports now automatically display amounts in the **correct currency** for each ad account!

---

## 💱 Supported Currencies

### Automatic Detection:
- ✅ **INR** (₹) - Indian Rupees
- ✅ **USD** ($) - US Dollars
- ✅ **EUR** (€) - Euros
- ✅ **GBP** (£) - British Pounds
- ✅ **AUD** (A$) - Australian Dollars
- ✅ **CAD** (CA$) - Canadian Dollars
- ✅ **SGD** (S$) - Singapore Dollars
- ✅ **AED** (د.إ) - UAE Dirhams

**Plus many more!** The system auto-detects from your ad account settings.

---

## 📊 How Currency Works

### What You'll See:

**For Indian Ad Accounts:**
```
Total Spend: ₹25,450.00
CPC: ₹12.50
CPM: ₹185.00
Currency: INR
```

**For US Ad Accounts:**
```
Total Spend: $342.50
CPC: $0.85
CPM: $12.50
Currency: USD
```

**For UK Ad Accounts:**
```
Total Spend: £245.00
CPC: £0.65
CPM: £8.50
Currency: GBP
```

---

## 🔑 How to Get Campaign Data

### What You Need:

**1. Ad Account ID**
- Where: Facebook Ads Manager
- Format: Numbers only (e.g., `123456789`)
- Don't include `act_` prefix

**2. Ads API Access Token**
- Where: Graph API Explorer or Marketing API Tools
- Permissions: `ads_read`, `ads_management`
- Type: User token (NOT page token)

---

## 🎯 Step-by-Step: Get Ads Token

### Method 1: Marketing API Tools (Easy)

**You showed me this page earlier!**

**Go to:**
```
developers.facebook.com
→ Your App (SM Analytics 2)
→ Tools → Marketing API
```

**On that page:**
1. **"Get Access Token" section**
2. Click **"Get Token"** button
3. **Select permissions:**
   ```
   ✅ ads_read
   ✅ ads_management (optional)
   ```
4. **Copy the token** that appears
5. **Use in Campaign Analytics**

---

### Method 2: Graph API Explorer

**Go to:**
```
https://developers.facebook.com/tools/explorer/
```

**Step 1: Generate Token**
```
Click "Generate Access Token"
Check:
  ✅ ads_read
  ✅ ads_management
  ✅ business_management
Generate
```

**Step 2: Copy Token**
```
From top panel (for ads, user token is correct!)
```

---

## 📋 How to Get Ad Account ID

### Step 1: Query Your Ad Accounts

**In Graph API Explorer:**
```
me/adaccounts?fields=id,name,currency,account_status
```

**Response:**
```json
{
  "data": [
    {
      "id": "act_123456789",
      "name": "My Ad Account",
      "currency": "INR",
      "account_status": 1
    }
  ]
}
```

### Step 2: Extract ID

**Full ID:** `act_123456789`  
**Use this:** `123456789` (remove "act_" prefix)

---

## 💰 Currency Conversion Explained

### Facebook API Returns Amounts in Smallest Unit:

**For INR (Indian Rupees):**
- API returns: 2545000 (paise)
- System converts: ÷ 100 = ₹25,450.00
- Display: ₹25,450.00

**For USD (US Dollars):**
- API returns: 34250 (cents)
- System converts: ÷ 100 = $342.50
- Display: $342.50

**Automatic:**
- System detects currency from API
- Converts automatically
- Displays with correct symbol

---

## 🎯 Complete Campaign Analytics Features

### 📊 Account Summary (Top Cards):
```
💰 Total Spend: ₹25,450.00 INR
👁️  Impressions: 1,250,000
🖱️  Clicks: 15,420
📊 Campaigns: 3 Active / 5 Total
```

### 📈 Campaign Level:
```
Campaign: Diwali Festival Sale
- Objective: CONVERSIONS
- Status: ACTIVE
- Spend: ₹15,000.00
- Impressions: 850,000
- Reach: 245,000
- Clicks: 8,500
- CTR: 1.0%
- CPC: ₹1.76
- CPM: ₹17.65
```

### 🎯 Ad Set Level:
```
Ad Set: Kompally Audience
- Optimization: CONVERSIONS
- Billing: IMPRESSIONS
- Spend: ₹8,500.00
- Impressions: 450,000
- Clicks: 4,200
- CTR: 0.93%
- Target: Age 25-45, Hyderabad
```

### 🎨 Ad Level (Individual Ads):
```
Ad: Creative 1 - Food Image
- Status: ACTIVE
- Spend: ₹4,200.00
- Impressions: 225,000
- Clicks: 2,100
- CTR: 0.93%
- CPC: ₹2.00
- Creative: [Image preview]
```

---

## 📱 How to Use Campaign Analytics

### Step 1: Navigate
```
http://localhost:3000/campaigns
```

Or click **"Campaigns"** in top navigation

### Step 2: Enter Details
```
Ad Account ID: 123456789
Access Token: [Ads token from Graph API Explorer]
Start Date: 2024-10-01
End Date: 2024-11-06
```

### Step 3: Generate Report
```
Click "Generate Report"
Wait 10-15 seconds
See complete campaign hierarchy!
```

### Step 4: Explore Data
```
Click campaign to expand → See ad sets
Click ad set to expand → See individual ads
View metrics at each level
All amounts in correct currency!
```

---

## 💡 Currency Display Examples

### Indian Account (INR):
```
Spend: ₹25,450.00
CPC: ₹12.50
CPM: ₹185.00
Budget: ₹50,000.00
```

### US Account (USD):
```
Spend: $342.50
CPC: $0.85
CPM: $12.50
Budget: $1,000.00
```

### Multi-Currency Scenario:
```
If you manage accounts in different countries:
- Indian account shows: ₹
- US account shows: $
- UK account shows: £
Each displays correctly!
```

---

## 🎯 Where to Get Ad Account Details

### Facebook Ads Manager:
```
1. Go to: business.facebook.com/adsmanager
2. Click account dropdown (top left)
3. See "Ad Account Settings"
4. Copy "Ad Account ID"
```

### Via API:
```
Query: me/adaccounts?fields=id,name,currency

Response shows:
- Ad account ID
- Account name  
- Currency code
```

---

## ⚠️ Important Notes

### About Amounts:

**Facebook API Behavior:**
- Returns spend in **smallest currency unit**
- INR: Returns in paise (₹1 = 100 paise)
- USD: Returns in cents ($1 = 100 cents)

**Our System:**
- ✅ Automatically divides by 100
- ✅ Detects currency from API
- ✅ Formats with correct symbol
- ✅ Shows 2 decimal places

### Example:
```
API returns: { "spend": "2545000", "currency": "INR" }
Our system: ₹25,450.00 INR
```

---

## 📋 Campaign Report Structure

### Hierarchy:
```
Account
  └─ Campaign 1 (₹15,000 spend)
      ├─ Ad Set 1.1 (₹8,500 spend)
      │   ├─ Ad 1.1.1 (₹4,200 spend)
      │   └─ Ad 1.1.2 (₹4,300 spend)
      └─ Ad Set 1.2 (₹6,500 spend)
          ├─ Ad 1.2.1 (₹3,000 spend)
          └─ Ad 1.2.2 (₹3,500 spend)
```

### Each Level Shows:
- ✅ Name & ID
- ✅ Status (Active/Paused/Archived)
- ✅ Budget (in account currency)
- ✅ Spend (in account currency)
- ✅ Impressions, Reach, Clicks
- ✅ CTR, CPC, CPM (in account currency)
- ✅ Frequency

---

## 🚀 Try It Now

### Test with Your Ad Account:

**Step 1: Get Ads Token**
```
Graph API Explorer
Generate with: ads_read permission
Copy from top panel
```

**Step 2: Get Ad Account ID**
```
Query: me/adaccounts
Copy ID (without act_ prefix)
```

**Step 3: Open Campaign Analytics**
```
http://localhost:3000/campaigns
```

**Step 4: Fill Form**
```
Ad Account ID: [Your ID]
Access Token: [Ads token]
Dates: Last 30 days
```

**Step 5: Generate**
```
Click "Generate Report"
See all campaigns in your currency! 💰
```

---

## ✅ What's Fixed

**Before:**
- All amounts shown in USD ($)
- ₹25,000 displayed as $25,000 ❌
- Confusing for Indian clients

**After:**
- Amounts shown in actual currency
- ₹25,000 displayed as ₹25,000 ✅
- INR, USD, EUR, GBP all supported
- Auto-detects from ad account settings

---

## 🎉 Benefits

### For Agencies:
- ✅ Manage clients in different countries
- ✅ Each client sees their currency
- ✅ No manual conversion needed
- ✅ Professional presentation

### For Reports:
- ✅ Accurate financial data
- ✅ Clear budget tracking
- ✅ Easy ROI calculation
- ✅ Client-ready exports

---

## 💡 Example Campaign Report

### OTC Kompally Campaign (INR):
```
Campaign: "Restaurant Awareness - November"
Budget: ₹50,000.00
Spent: ₹25,450.00
Impressions: 1,250,000
Clicks: 8,500
CTR: 0.68%
CPC: ₹2.99
CPM: ₹20.36

Ad Set 1: "Kompally 5km Radius"
Spent: ₹15,200.00
Clicks: 5,100
CPC: ₹2.98

  Ad 1: "Food Image Creative"
  Spent: ₹8,500.00
  Clicks: 2,850
  
  Ad 2: "Video Creative"
  Spent: ₹6,700.00
  Clicks: 2,250
```

**Everything in rupees! ₹**

---

## ✅ Summary

**Question:** Which access token for campaigns?

**Answer:**
- **Type:** Ads API token (user token)
- **Permissions:** `ads_read`, `ads_management`
- **Get from:** Graph API Explorer OR Marketing API Tools
- **Copy from:** Top panel (not from me/accounts)

**Currency:**
- ✅ Auto-detected from ad account
- ✅ Displayed with correct symbol
- ✅ Properly converted from API format
- ✅ Works for INR, USD, EUR, GBP, and more

---

**Go to Marketing API Tools (the page you showed me), get an ads token, and you'll see all your campaign data in the correct currency!** 💰📊✨

