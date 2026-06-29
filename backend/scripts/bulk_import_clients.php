# 🚀 Client Onboarding Guide - Best Methods to Add Multiple Clients

## Overview

As an agency managing multiple clients, you need efficient ways to add and manage social media accounts at scale.

---

## 📋 Method 1: Via Dashboard UI (Easiest)

### Best For: 
- Adding 1-10 clients manually
- When you have immediate access to credentials
- Training team members

### Steps:

1. **Open Dashboard**: http://localhost:3000
2. **Click "MANAGE ACCOUNTS"** (top-right button)
3. **For Each Client:**
   ```
   Platform: Facebook/Instagram
   Account Name: Client Name - Platform
   Account ID: [Page ID or IG Business ID]
   Access Token: [From Graph API Explorer]
   ```
4. **Click "+ ADD ACCOUNT"**
5. **Repeat** for each client

### Pros:
- ✅ Visual interface
- ✅ Immediate validation
- ✅ See accounts list update
- ✅ No technical knowledge needed

### Cons:
- ⏱️ Time-consuming for many clients
- 🔄 Repetitive for 20+ accounts

---

## 📊 Method 2: Bulk CSV Import (Most Efficient)

### Best For:
- Adding 10+ clients at once
- Migrating from other tools
- Agency onboarding process

### Steps:

#### 1. Prepare CSV File

Create `clients.csv` with this format:
```csv
platform,account_name,account_id,access_token,handle
facebook,Client A Page,123456789,EAAA...,ClientAPage
instagram,Client A Instagram,17841405...,EAAA...,@clienta
facebook,Restaurant B,987654321,EAAA...,RestaurantB
youtube,Brand YouTube,UCxxxxxx,ya29...,BrandChannel
```

**Template:** Use `backend/scripts/clients_template.csv`

#### 2. Run Import Script

```bash
cd backend/scripts
php bulk_import_clients.php clients.csv
```

#### 3. Review Results

```
Starting bulk import...

✓ Imported: Client A Page (facebook)
✓ Imported: Client A Instagram (instagram)
✓ Imported: Restaurant B (facebook)
...

Import Complete!
Successfully imported: 25 accounts
Errors: 0
```

### Pros:
- ⚡ Very fast (100+ clients in seconds)
- ✅ Bulk operation
- ✅ Easy to prepare in Excel
- ✅ Repeatable process

### Cons:
- 🔧 Requires command-line access
- 📝 Need to prepare CSV correctly

---

## 🔌 Method 3: OAuth Flow (Most Professional)

### Best For:
- Client self-service
- Agencies with many clients
- White-label solutions

### Implementation:

**Already built in:** `backend/api/oauth.php`

### How It Works:

1. **Send client a link:**
   ```
   http://yourapp.com/api/oauth.php/oauth/login
   ```

2. **Client clicks** → Redirected to Facebook

3. **Client authorizes** your app

4. **Callback automatically:**
   - Fetches all their Pages
   - Gets Instagram accounts
   - Stores tokens in database
   - Returns to dashboard

5. **Done!** Client's accounts added automatically ✅

### Setup Required:

1. Configure OAuth redirect URI in Meta app
2. Deploy with HTTPS (required for production)
3. For local testing, use ngrok:
   ```bash
   ngrok http 8000
   https://abc123.ngrok.io/api/oauth.php/oauth/login
   ```

### Pros:
- 🎯 Most professional
- ✅ Client self-service
- ✅ Fully automated
- ✅ Secure (OAuth standard)
- ✅ No manual token copying

### Cons:
- 🔧 Requires HTTPS
- ⏱️ Setup takes time initially

---

## 🔄 Method 4: API Integration (For Developers)

### Best For:
- Integrating with existing systems
- Custom automation
- CRM integration

### Example:

```bash
curl -X POST http://localhost:8000/accounts.php \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "facebook",
    "account_name": "New Client Page",
    "account_id": "123456789",
    "access_token": "EAAA..."
  }'
```

### Pros:
- 🔌 Programmable
- ✅ Integrate with other tools
- ✅ Automation-friendly

---

## 💼 Best Practice: Hybrid Approach

### Recommended Workflow:

**For First 5-10 Clients (Manual):**
1. Use dashboard UI ("MANAGE ACCOUNTS")
2. Learn the process
3. Understand token requirements

**For Scaling (10-50 Clients):**
1. Prepare CSV with client data
2. Use bulk import script
3. Verify in dashboard

**For Enterprise (50+ Clients):**
1. Implement OAuth self-service
2. Send clients authorization link
3. Automatic onboarding
4. Minimal manual work

---

## 📝 Client Data Collection Template

### Information Needed per Client:

**For Facebook:**
```
✓ Client/Brand Name
✓ Facebook Page ID (from Page Settings → About)
✓ Access Token (from Graph API Explorer)
✓ Page Handle (optional)
```

**For Instagram:**
```
✓ Client/Brand Name
✓ Instagram Business Account ID (17-digit number)
✓ Access Token (same as Facebook Page token)
✓ Instagram Handle (@username)
```

**For YouTube:**
```
✓ Channel Name
✓ Channel ID (UCxxxxxx)
✓ OAuth Token
```

---

## 🔑 Getting Tokens for Multiple Clients

### Scenario A: You Have Admin Access

If you're admin on all client pages:

1. **Graph API Explorer**: https://developers.facebook.com/tools/explorer/
2. **Generate token** with your account
3. **Query:** `me/accounts`
4. **Get all pages** you admin
5. **Copy each page's token** (never expires!)
6. **Bulk import** or add via UI

### Scenario B: Clients Provide Access

**Option 1: OAuth Flow (Best)**
- Send client authorization link
- They authorize
- Automatic import ✅

**Option 2: They Make You Admin**
- Client adds you as Page admin
- You generate tokens
- Remove admin access later if needed

**Option 3: Client Generates Token**
- Send them instructions
- They use Graph API Explorer
- They send you token
- You import

---

## 📊 Multi-Client Management Features

### Already Built:

**Account Dropdown:**
- Shows all connected accounts
- Easy switching between clients
- Platform indicator

**Separate Reports:**
- Generate for any client
- Download client-specific PDFs
- Professional deliverables

**Workspace Support (Advanced):**
- Group clients by workspace
- Multi-brand management
- Team collaboration (schema_v2.sql)

---

## 🎯 Quick Start: Add 5 Clients

### Step 1: Get Access to Client Pages

Ask clients to:
- Make you Page admin (temporary)
- Or use OAuth link when deployed

### Step 2: Generate Tokens

**Graph API Explorer Method:**
```
1. Login with account that's admin on all pages
2. Generate token with permissions:
   ✓ pages_show_list
   ✓ pages_read_engagement
   ✓ read_insights
   ✓ instagram_basic
   ✓ instagram_manage_insights
3. Query: me/accounts
4. Copy each page's ID and token
```

### Step 3: Bulk Import

**Create CSV:**
```csv
platform,account_name,account_id,access_token,handle
facebook,Client 1,123,EAAA...,@client1
instagram,Client 1 IG,456,EAAA...,@client1ig
facebook,Client 2,789,EAAA...,@client2
```

**Run Import:**
```bash
php backend/scripts/bulk_import_clients.php clients.csv
```

### Step 4: Verify

1. Dashboard → "MANAGE ACCOUNTS"
2. See all 5+ clients listed
3. Test generating reports ✅

---

## 🔐 Security Best Practices

### Token Management:

1. **Store securely** in database (encrypted in production)
2. **Never commit** tokens to Git
3. **Rotate regularly** (use refresh tokens)
4. **Monitor expiration** (set up alerts)
5. **Remove access** when client leaves

### Access Control:

1. **Workspace isolation** - Clients can't see each other
2. **Role-based access** - Admin, user, viewer
3. **Audit logging** - Track who accessed what
4. **Token scoping** - Minimum required permissions

---

## 📈 Scaling Strategies

### For 10 Clients:
- ✅ Manual UI entry works fine
- ⏱️ 5 minutes per client = 50 minutes total

### For 50 Clients:
- ✅ Use CSV bulk import
- ⏱️ Prepare CSV (30 mins) + Import (2 mins)
- 📊 Much faster than manual

### For 100+ Clients:
- ✅ Implement OAuth self-service
- ✅ Automate token refresh
- ✅ Use System User tokens (Meta)
- ✅ Deploy workspace management

---

## 🎯 Recommended: 3-Tier Approach

### Tier 1: Quick Add (1-5 clients)
**Use:** Dashboard UI  
**Time:** 5 minutes per client  
**Skill:** Anyone can do it

### Tier 2: Bulk Add (5-50 clients)
**Use:** CSV Import  
**Time:** 30 minutes total  
**Skill:** Basic CSV/Excel knowledge

### Tier 3: Self-Service (50+ clients)
**Use:** OAuth Flow  
**Time:** One-time setup, then automatic  
**Skill:** Deploy with HTTPS

---

## 💡 Pro Tips

### 1. **Standardize Naming**
```
Good:
- "Brand Name - Facebook"
- "Brand Name - Instagram"
- "Brand Name - YouTube"

Avoid:
- "FB Page"
- "IG"
- Random names
```

### 2. **Use Workspaces**
```
Workspace: Restaurant Clients
  → Restaurant A - FB
  → Restaurant A - IG
  → Restaurant B - FB
  
Workspace: E-commerce Clients
  → Shop X - FB
  → Shop X - IG
  → Shop Y - FB
```

### 3. **Document Client Info**
Keep a spreadsheet:
| Client | Platform | ID | Token Updated | Last Report |
|--------|----------|-----|---------------|-------------|
| Client A | Facebook | 123 | 2024-11-01 | 2024-11-05 |

### 4. **Automate Token Refresh**
```bash
# Run nightly
0 3 * * * php /path/to/refresh_tokens.php
```

---

## 🔄 Client Offboarding

### When Client Leaves:

**Method 1: Soft Delete (Recommended)**
```sql
UPDATE accounts SET is_active = 0 WHERE account_id = 'CLIENT_ID';
```

**Method 2: Hard Delete**
```sql
DELETE FROM accounts WHERE account_id = 'CLIENT_ID';
```

**Method 3: Via UI**
1. MANAGE ACCOUNTS
2. Click Delete button for client
3. Confirms and removes

---

## 📊 Example: Onboarding 10 Clients

### Scenario: Digital Marketing Agency

**Clients:**
1. Armario Pro (Interior Design) - FB + IG
2. Tecora Restaurant - FB
3. Fashion Brand - FB + IG
4. Tech Startup - FB + IG + YouTube
5. Local Cafe - FB + IG
6. Fitness Studio - IG
7. Real Estate - FB
8. Beauty Salon - FB + IG
9. Consulting Firm - FB + LinkedIn
10. E-commerce Store - FB + IG

**Process:**

#### Week 1: Setup First 3 (Practice)
- Use dashboard UI
- Learn token generation
- Test report generation

#### Week 2: Bulk Import Rest
- Collect all credentials
- Create CSV file
- Bulk import 7 remaining clients
- Verify all working

#### Week 3: Automation
- Set up OAuth for new clients
- Implement cron for daily pulls
- Schedule weekly reports

**Result:** Managing 10 clients with automated reporting! ✅

---

## 🎨 Client Dashboard View

### What Clients See:

**After Adding Multiple Clients:**

```
Generate Report
┌──────────────────────────────────────┐
│ Select Account: [▼ Dropdown]         │
│   - Armario Pro (facebook)           │
│   - Tecora Restaurant (facebook)     │
│   - Fashion Brand (instagram)        │
│   - Tech Startup (youtube)           │
│   - Local Cafe (instagram)           │
│   - ... (all 10+ clients)            │
│                                      │
│ Period: [Last 30 Days ▼]            │
│                                      │
│ [GENERATE REPORT]                    │
└──────────────────────────────────────┘
```

**Easy switching between clients!**

---

## 🚀 Quick Start Scripts

### 1. Add Single Client (Command Line)

```bash
# Add via API
curl -X POST http://localhost:8000/accounts.php \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "facebook",
    "account_name": "New Client",
    "account_id": "123456789",
    "access_token": "EAAA..."
  }'
```

### 2. List All Clients

```bash
curl http://localhost:8000/accounts.php
```

### 3. Generate Report for Client

```bash
curl -X POST http://localhost:8000/generate_report.php \
  -H "Content-Type: application/json" \
  -d '{
    "accountId": 1,
    "startDate": "2024-10-01",
    "endDate": "2024-10-31"
  }'
```

---

## 📁 Workspace Organization (Advanced)

### Schema Already Supports:

```sql
-- Create workspace for client group
INSERT INTO workspaces (name, slug) 
VALUES ('Restaurant Clients', 'restaurant-clients');

-- Assign accounts to workspace
INSERT INTO workspace_accounts (workspace_id, account_id)
VALUES (1, 1), (1, 2), (1, 3);
```

### Benefits:
- ✅ Group related clients
- ✅ Filter by workspace
- ✅ Team permissions per workspace
- ✅ Separate billing/reporting

---

## 🎯 Recommended Process

### For New Agency Client:

**Step 1: Discovery**
- Get list of their social accounts
- Identify which platforms they use
- Confirm business accounts (IG)

**Step 2: Access**
- Ask to be made Page admin (temp)
- Or send OAuth link
- Collect credentials

**Step 3: Onboarding**
- Add to dashboard
- Generate initial report
- Verify data accuracy

**Step 4: Ongoing**
- Weekly/monthly reports
- Track growth
- Optimize strategy

---

## 💻 Technical Implementation

### For Developers:

**Create Admin Panel:**
```javascript
// Add bulk import UI
<Button onClick={handleBulkImport}>
  Import Clients from CSV
</Button>
```

**Add Client API Endpoint:**
```php
// backend/api/bulk_clients.php
POST /bulk_clients.php
Body: { clients: [...] }
```

**Workspace Switcher:**
```javascript
<Select>
  <MenuItem value="all">All Clients</MenuItem>
  <MenuItem value="restaurants">Restaurants</MenuItem>
  <MenuItem value="retail">Retail</MenuItem>
</Select>
```

---

## 📊 Monitoring Multiple Clients

### Dashboard Features:

**Client List View:**
- See all clients at a glance
- Last report generated
- Token status (active/expired)
- Platform indicators

**Bulk Actions:**
- Generate reports for all clients
- Refresh all tokens
- Export all data

**Alerts:**
- Token expiring soon
- API errors by client
- Missing data notifications

---

## 🔑 Token Management at Scale

### Best Practices:

**1. Use Page Tokens (Never Expire)**
```
From Graph API: me/accounts
Each page has its own token
These never expire!
```

**2. System User Tokens (Enterprise)**
```
Business Manager → System Users
Create system user
Assign assets
Generate token
Rotate programmatically
```

**3. Monitor & Refresh**
```
Daily cron job:
- Check token expiration
- Refresh if needed
- Alert on failures
```

---

## 📋 Client Onboarding Checklist

### For Each New Client:

- [ ] Get Facebook Page ID
- [ ] Get Instagram Business Account ID (if applicable)
- [ ] Generate/receive access token
- [ ] Verify token permissions
- [ ] Add to database (UI/CSV/OAuth)
- [ ] Test report generation
- [ ] Generate baseline report
- [ ] Schedule recurring reports
- [ ] Document in client spreadsheet

---

## 🎉 Quick Win: Add Your Next Client NOW

### If you have another client ready:

**Option A: Use Dashboard UI**
1. http://localhost:3000
2. "MANAGE ACCOUNTS"
3. Add their credentials
4. Done in 2 minutes! ✅

**Option B: Use Terminal**
```bash
curl -X POST http://localhost:8000/accounts.php \
  -H "Content-Type: application/json" \
  -d '{
    "platform": "facebook",
    "account_name": "Tecora Restaurant",
    "account_id": "674273839102953",
    "access_token": "EAAA..."
  }'
```

---

## 🚀 Scaling to 100+ Clients

### When You Grow:

**Phase 1: Manual (1-10 clients)**
- Dashboard UI ✅

**Phase 2: Bulk (10-50 clients)**
- CSV Import ✅

**Phase 3: Automated (50+ clients)**
- OAuth self-service ✅
- System User tokens ✅
- Workspace management ✅
- Automated ingestion ✅

### Infrastructure Ready:
- ✅ Schema supports unlimited accounts
- ✅ Workspace multi-tenancy
- ✅ Token refresh automation
- ✅ Job tracking system

---

## 💡 Summary

**Best Method Depends On:**

| # of Clients | Best Method | Time | Complexity |
|--------------|-------------|------|------------|
| 1-5 | Dashboard UI | 5 min each | Easy ⭐ |
| 5-20 | CSV Import | 30 min total | Medium ⭐⭐ |
| 20-50 | CSV + OAuth | 1 hour | Medium ⭐⭐ |
| 50+ | OAuth Self-Service | 2 hours setup | Advanced ⭐⭐⭐ |

---

## ✅ You're Ready to Scale!

**Current Clients:** 1 (Armario Pro)  
**Add Next:** Use "MANAGE ACCOUNTS" for quick add  
**Scale Later:** Use CSV or OAuth when you have more  

**All methods are ready and working!** 🚀

---

## 📞 Need Help?

**Adding clients:** Use dashboard UI  
**Bulk import:** Use CSV script  
**OAuth setup:** Follow META_SETUP_CHECKLIST.md  
**Automation:** Use cron/daily_ingestion.php  

**Your platform is built to scale from 1 to 1000+ clients!** 📊✨

