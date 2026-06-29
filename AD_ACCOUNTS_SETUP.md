# 💰 Ad Accounts Management - Save Client Campaigns

## ✅ NEW FEATURE: Save Ad Account Credentials!

Now you can **save ad account IDs and tokens** for all clients, just like organic accounts!

---

## 🎯 What This Does

### Before:
```
❌ Enter ad account ID every time
❌ Enter access token every time
❌ Copy/paste for each report
❌ Time consuming
```

### Now:
```
✅ Save ad account once
✅ Select from dropdown
✅ Generate reports instantly
✅ Manage multiple clients easily
```

---

## 🚀 How to Use

### Step 1: Open Campaign Analytics
```
http://localhost:3000/campaigns
```

Or click **"Campaigns"** in top navigation

---

### Step 2: Click "Manage Ad Accounts"
```
Button in top-right of the page
Opens dialog to manage ad accounts
```

---

### Step 3: Add Your First Ad Account

**Fill in the form:**

```
Client Name: OTC Kompally
Ad Account ID: 123456789 (without 'act_' prefix)
Account Name: OTC Ads (optional)
Currency: INR (₹) - Indian Rupees
Access Token: [Paste ads token here]
```

**Click:** "Add Ad Account"

**Result:** ✅ Ad account added successfully!

---

### Step 4: Repeat for All Clients

**Add more clients:**
```
Client 2: Armario Pro
Ad Account ID: 987654321
Currency: INR
Token: [Paste token]

Client 3: Bikanervala
Ad Account ID: 555666777
Currency: INR
Token: [Paste token]
```

---

### Step 5: Select & Generate

**Close the dialog**

**Now you'll see:**
```
Dropdown shows:
- OTC Kompally (INR)
- Armario Pro (INR)
- Bikanervala (INR)
```

**Select one → Pick dates → Generate Report!** 🎉

---

## 📋 How to Get Ad Account Details

### Get Ad Account ID & Currency:

**Graph API Explorer:**
```
Query: me/adaccounts?fields=id,name,currency

Response:
{
  "data": [
    {
      "id": "act_123456789",
      "name": "OTC Kompally Ad Account",
      "currency": "INR"
    }
  ]
}
```

**Extract:**
- Ad Account ID: `123456789` (remove "act_" prefix)
- Currency: `INR`
- Account Name: `OTC Kompally Ad Account`

---

### Get Access Token:

**Graph API Explorer:**
```
1. Click "Generate Access Token"
2. Check permissions:
   ✅ ads_read
   ✅ ads_management
3. Generate
4. Copy from top panel
```

**Or use Marketing API Tools** (that page you showed me)

---

## 💡 Features

### ✅ Add Ad Accounts:
- Client name
- Ad account ID
- Currency selection
- Access token
- Optional account name

### ✅ Edit Ad Accounts:
- Update client name
- Change currency
- Update token (optional - leave blank to keep existing)
- Update account name

### ✅ Delete Ad Accounts:
- Remove old clients
- Confirmation dialog
- Permanent deletion

### ✅ List View:
- See all saved ad accounts
- Shows client name, ID, currency
- Shows when added
- Edit/Delete buttons

---

## 📊 Database Structure

### New Table: `ad_accounts`

```sql
id              - Auto-increment
client_name     - Client/business name
ad_account_id   - Facebook ad account ID (without 'act_')
access_token    - Ads API token
currency        - INR, USD, EUR, etc.
account_name    - Optional friendly name
is_active       - Active status
created_at      - When added
updated_at      - Last updated
```

---

## 🎯 Usage Examples

### Example 1: Add OTC Kompally

**Step 1: Get credentials**
```
Graph API Explorer
Query: me/adaccounts
Find OTC account
Copy ID and generate ads token
```

**Step 2: Add to system**
```
Campaigns → Manage Ad Accounts
Client Name: OTC Kompally
Ad Account ID: 123456789
Currency: INR
Token: [Paste]
Add
```

**Step 3: Use for reports**
```
Select: OTC Kompally (INR)
Generate campaign report
See data in rupees! ₹
```

---

### Example 2: Multiple Clients

**Scenario: You manage 5 restaurant clients**

**Add all 5:**
```
1. OTC Kompally (INR)
2. Bikanervala (INR)
3. Armario Pro (INR)
4. Tales of Telugu (INR)
5. Paradise Restaurant (INR)
```

**Generate reports:**
```
Select client from dropdown
Pick date range
Generate
All data in INR automatically!
```

---

### Example 3: International Client

**US-based client:**
```
Client Name: NYC Coffee Shop
Ad Account ID: 999888777
Currency: USD
Token: [US ad account token]
```

**Reports show:**
```
Total Spend: $1,245.50 (not ₹1,245.50)
CPC: $0.85
CPM: $12.50
```

---

## 🔧 Complete Workflow

### Initial Setup (One Time):

**For Each Client:**
```
1. Get their ad account ID
2. Generate ads token with their permissions
3. Add to "Manage Ad Accounts"
4. Select currency
5. Save
```

### Daily Use:

**Generating Reports:**
```
1. Open: http://localhost:3000/campaigns
2. Select: Client from dropdown
3. Dates: Pick range
4. Generate: Click button
5. Done! No token entry needed!
```

---

## 💾 Token Security

### Access Token Handling:

**Storage:**
- ✅ Encrypted in database (text field)
- ✅ Not shown in UI (password field)
- ✅ Can update without re-entering

**Editing:**
- Leave token field blank = Keep existing token
- Enter new token = Update token
- Shows "Leave blank to keep existing" helper text

---

## 🎨 UI Features

### Ad Account Manager Dialog:

**Top Section - Add/Edit Form:**
```
[Client Name field]
[Ad Account ID field]
[Account Name field (optional)]
[Currency dropdown]
[Access Token field (password)]
[Add/Update button]
```

**Bottom Section - Saved Accounts:**
```
┌──────────────────────────────────────┐
│ OTC Kompally                    [✏️] [🗑️] │
│ Ad Account: 123456789                 │
│ Currency: INR                         │
│ Added: 6/11/2024                      │
├──────────────────────────────────────┤
│ Armario Pro                     [✏️] [🗑️] │
│ Ad Account: 987654321                 │
│ Currency: INR                         │
│ Added: 6/11/2024                      │
└──────────────────────────────────────┘
```

---

## 📱 Campaign Analytics Updated

### New Layout:

**Before:**
```
[Ad Account ID field]
[Access Token field]
[Start Date] [End Date]
[Generate button]
```

**After:**
```
[Manage Ad Accounts button]  ← Top right

[Select Ad Account dropdown]  ← Choose saved account
[Start Date] [End Date]
[Generate Report button]

Or if no accounts:
"No ad accounts connected yet"
[Add Ad Account button]
```

---

## 🎯 Benefits

### For You:
- ✅ Save time (no repeated entry)
- ✅ Manage multiple clients easily
- ✅ Quick report generation
- ✅ Organized client list

### For Clients:
- ✅ Faster reports
- ✅ More professional
- ✅ Consistent experience
- ✅ No risk of wrong token

### For Teams:
- ✅ Shared client database
- ✅ Everyone uses same credentials
- ✅ Centralized management
- ✅ Easy onboarding

---

## 📊 Files Created

**Backend:**
- ✅ `backend/schema_ad_accounts.sql` - Database table
- ✅ `backend/api/ad_accounts.php` - CRUD API
- ✅ Updated `FacebookAdsService.php` - Currency support

**Frontend:**
- ✅ `frontend/src/components/AdAccountManager.jsx` - Management dialog
- ✅ Updated `CampaignAnalytics.jsx` - Dropdown integration

---

## 🚀 Try It Now

### Step 1: Refresh Frontend
```
http://localhost:3000/campaigns
Cmd + Shift + R (hard refresh)
```

### Step 2: Add First Ad Account
```
Click: "Manage Ad Accounts"
Fill in: Client details
Currency: INR
Token: [Ads token from Graph API Explorer]
Click: Add
```

### Step 3: Generate Report
```
Select: Your client from dropdown
Dates: Last 30 days
Generate: Click button
See: Campaign data in correct currency!
```

---

## 🔑 How to Get Ads Token (Quick Reminder)

### Graph API Explorer:
```
1. https://developers.facebook.com/tools/explorer/
2. Generate Access Token
3. Check: ads_read, ads_management
4. Copy from top panel (user token is correct!)
5. Paste in "Access Token" field when adding ad account
```

---

## ⚠️ Important Notes

### Token Permissions:
- **Organic accounts:** Need `instagram_basic`, `pages_read_engagement`
- **Ad accounts:** Need `ads_read`, `ads_management`
- **Different tokens!** Don't mix them up

### Currency Setting:
- Select correct currency when adding account
- INR for Indian ad accounts
- USD for US ad accounts
- Can change later by editing

### Ad Account ID Format:
- Facebook shows: `act_123456789`
- **Enter just:** `123456789` (without 'act_' prefix)
- System will handle the prefix automatically

---

## ✅ Complete Client Setup

### For Each Client, You Now Save:

**Organic Data:**
- Facebook Page ID + Token
- Instagram Business ID + Token
- Stored in: `accounts` table

**Ads Data:**
- Ad Account ID + Token
- Currency setting
- Stored in: `ad_accounts` table

**One-time setup, unlimited reports!** 🎉

---

## 🎊 What You Can Do Now

**Campaign Analytics:**
- [x] Save ad account credentials
- [x] Select from dropdown
- [x] Edit ad accounts
- [x] Delete ad accounts
- [x] Multi-currency support
- [x] Quick report generation
- [x] No repeated token entry
- [x] Manage multiple clients

---

**Refresh your campaigns page and click "Manage Ad Accounts" to start adding your clients!** 💰📊✨

