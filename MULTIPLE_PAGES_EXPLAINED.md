# Multiple Pages with One App - Explained

## Short Answer: **YES!** ✅

Your **single Facebook App** can access **unlimited pages** from **multiple users**. You don't "add" pages to the app - users grant access to their pages through OAuth.

## How It Works

### 1. Graph API Explorer vs Your App

**Graph API Explorer:**
- Just a **testing tool** for developers
- You test with **one token at a time**
- Not where you "add" pages to your app
- Used for debugging/testing API calls

**Your App:**
- **One App ID** (`872614585203502`)
- Can access **multiple pages** from **multiple users**
- Each user connects their own pages via OAuth
- Pages are stored in your database separately

### 2. How Multiple Pages Work

When a user logs in via OAuth:

1. **User authorizes your app** with their Facebook account
2. **Your app gets an access token** for that user
3. **Your app calls `/me/accounts`** to get ALL pages the user manages
4. **User selects which pages** to connect
5. **Each page is saved separately** in your database

### 3. Current Implementation

Your app already supports multiple pages! Here's how:

```php
// In oauth_login.php - fetchOrganicAccounts()
$url = 'https://graph.facebook.com/v18.0/me/accounts';
// This returns ALL pages the user has access to
```

**What happens:**
- User A logs in → Connects Page 1, Page 2, Page 3
- User B logs in → Connects Page 4, Page 5
- All 5 pages are accessible through your **single app**

### 4. Database Structure

Each page is stored as a separate account:

```sql
accounts table:
- id: 1, platform: 'facebook', account_id: 'page_1_id', user_id: 1
- id: 2, platform: 'facebook', account_id: 'page_2_id', user_id: 1
- id: 3, platform: 'facebook', account_id: 'page_3_id', user_id: 1
- id: 4, platform: 'facebook', account_id: 'page_4_id', user_id: 2
```

### 5. Using System User Token

With a **System User Token**, you can access:
- **All pages** in your Business Manager
- **All ad accounts** in your Business Manager
- **All Instagram accounts** linked to those pages

This is what the "Single Token" feature does!

## Examples

### Example 1: Multiple Users, Multiple Pages

```
User 1 (John):
  - Page: "John's Business"
  - Page: "John's Restaurant"
  - Instagram: @johnsbusiness

User 2 (Sarah):
  - Page: "Sarah's Store"
  - Page: "Sarah's Blog"
  - Instagram: @sarahsstore

All connected through ONE app! ✅
```

### Example 2: Single Business Manager

```
Business Manager: "My Company"
  - Page: "Main Brand"
  - Page: "Product Line A"
  - Page: "Product Line B"
  - Ad Account: "Campaigns"
  - Instagram: @mainbrand

All accessible with ONE System User Token! ✅
```

## Graph API Explorer Usage

**In Graph API Explorer:**
- Select your app
- Generate a token (user token or page token)
- Test API calls for **one page at a time**
- This is just for **testing**, not for production

**In Your App:**
- Users connect via OAuth
- App automatically fetches **all their pages**
- Each page can be used independently
- No limit on number of pages!

## Key Points

✅ **One App = Unlimited Pages**
- Your app can access as many pages as users grant access to

✅ **Pages Belong to Users**
- Pages are associated with the Facebook user who connected them
- Each user sees only their own pages

✅ **No Manual "Adding"**
- Pages are discovered automatically via `/me/accounts`
- Users select which ones to connect

✅ **System User Token**
- Can access all pages in Business Manager
- Perfect for agencies managing multiple clients

## Testing Multiple Pages

1. **Connect via OAuth:**
   - Log in with a Facebook account that manages multiple pages
   - You'll see all pages listed
   - Select which ones to connect

2. **Use Single Token:**
   - Enter System User Token
   - Fetch all available accounts
   - Connect multiple pages at once

3. **Generate Reports:**
   - Select any connected page
   - Generate reports independently
   - Or use "Combined Report" for multiple pages

## Summary

**Graph API Explorer** = Testing tool (one page at a time)
**Your App** = Production system (unlimited pages from unlimited users)

You don't need to "add" pages to your app - they're automatically discovered when users connect via OAuth! 🎉

