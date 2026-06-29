# Single Token Access - Setup Guide

## Overview

Instead of OAuth flow for each user, you can use a **single System User Token** from Facebook Business Manager to access all pages and accounts. This is perfect for:
- Agencies managing multiple client accounts
- Businesses with multiple pages/accounts
- Single admin managing everything

## Option 1: System User Token (Recommended)

### What is a System User Token?

A System User Token is a long-lived token (60 days, can be refreshed) that has access to all pages and ad accounts in your Business Manager. It never expires if refreshed properly.

### Setup Steps

#### 1. Create System User in Business Manager

1. Go to [Facebook Business Manager](https://business.facebook.com)
2. Navigate to **Business Settings** → **Users** → **System Users**
3. Click **Add** → **Create New System User**
4. Name it (e.g., "Analytics API User")
5. Assign it to your app

#### 2. Generate System User Token

1. In **System Users**, click on your system user
2. Click **Generate New Token**
3. Select your app
4. Choose permissions:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_read_user_content`
   - `read_insights`
   - `instagram_basic`
   - `instagram_manage_insights`
   - `ads_read` (for ad accounts)
   - `ads_management` (for ad accounts)
   - `business_management`
5. Click **Generate Token**
6. **Copy the token immediately** (you won't see it again!)

#### 3. Exchange for Long-Lived Token

The token you get is short-lived. Exchange it for a long-lived token:

```bash
curl -X GET "https://graph.facebook.com/v18.0/oauth/access_token?grant_type=fb_exchange_token&client_id=YOUR_APP_ID&client_secret=YOUR_APP_SECRET&fb_exchange_token=YOUR_SHORT_TOKEN"
```

This returns a token that lasts 60 days.

#### 4. Use in Your App

Add this token to your config or database, and use it to fetch all pages/accounts.

## Option 2: Page Access Tokens (Never Expire!)

Once you have a user token (from OAuth), you can get **Page Access Tokens** that **never expire**:

```php
// Get page tokens (these never expire!)
$pages = $graph->get('/me/accounts', $userToken);
foreach ($pages as $page) {
    $pageToken = $page['access_token']; // This never expires!
    // Save this token - it works forever
}
```

## Option 3: Manual Token Entry (Current Feature)

You can already do this! In "Manage All Accounts", users can manually enter:
- Page Access Token
- Account ID
- Account Name

This works, but tokens expire and need manual refresh.

## Implementation: Single Token Mode

I can add a "Single Token Mode" feature that:

1. **Admin enters one System User Token**
2. **App automatically fetches all pages/accounts** from Business Manager
3. **No OAuth needed** - everything accessible immediately
4. **Auto-refresh tokens** before expiry

### Benefits:
- ✅ No OAuth flow needed
- ✅ Access to all accounts instantly
- ✅ Centralized management
- ✅ Perfect for agencies

### Drawbacks:
- ❌ Requires Business Manager setup
- ❌ All accounts under one Business Manager
- ❌ Less granular user control

## Quick Setup for Single Token

### Step 1: Get System User Token

Follow steps above to create and generate token.

### Step 2: Add to Config

```php
// backend/config/config.php
define('SYSTEM_USER_TOKEN', 'your_system_user_token_here');
define('USE_SINGLE_TOKEN_MODE', true);
```

### Step 3: Fetch All Accounts

```php
// This will fetch ALL pages/accounts accessible by the token
$url = 'https://graph.facebook.com/v18.0/me/accounts';
$params = [
    'fields' => 'id,name,access_token,instagram_business_account{id,username}',
    'access_token' => SYSTEM_USER_TOKEN
];
// Returns all pages user has access to
```

## Which Should You Use?

**Use OAuth (Current):**
- Each user manages their own accounts
- Users grant permissions themselves
- More secure and user-friendly
- Better for multi-user scenarios

**Use Single Token:**
- You manage all accounts centrally
- Agency managing multiple clients
- Single admin scenario
- Faster setup, no user interaction

## Hybrid Approach

You can support BOTH:
- OAuth for individual users
- Single token mode for admin/agency
- Toggle in settings

Would you like me to implement the single token mode feature?

