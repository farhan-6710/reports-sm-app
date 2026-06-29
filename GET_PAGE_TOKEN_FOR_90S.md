# Get Page Access Token for 90's Instagram Account

## ✅ You're Almost There!

You're trying to find the Instagram account linked to page `650073251534023` (90sauthentickitchen), but you need a **Page Access Token**, not a User Token.

---

## 🔧 Quick Fix Steps

### Step 1: Get Page Access Token

**In Graph API Explorer:**

1. **Keep your current User Token** (the one you have selected)

2. **Change the query** to get page tokens:
   ```
   me/accounts?fields=id,name,access_token,instagram_business_account{id,username}
   ```

3. **Click "Submit"**

4. **Find "90sauthentickitchen"** in the results

5. **Copy the `access_token`** from **inside the JSON response** (NOT the token in the top panel)

**Example Response:**
```json
{
  "data": [
    {
      "id": "650073251534023",
      "name": "90sauthentickitchen",
      "access_token": "EAATy7qAW3EoBQkraokDxcXvgR7p1ZBUMuFP1N5xSoLt25jmbZAvF40gqlriq5s65x0gT8fZBoLu8fLqSVE0B4JhuIwVV7sLKX54WzZBXmPJOIyZBkiQiq5jRPf3zgAHQ4qjLqrdbil2mOC77JIKZAxeS9grU3lSo5AZAgPzR1QjV5wGes27TEwZC1oJKd2Nemc17KukxeYDi1Xs8PZBNwkbFZAxvUlqRy39g0UdZBvRTxOG",
      "instagram_business_account": {
        "id": "17841473888497604",
        "username": "90sauthentickitchen"
      }
    }
  ]
}
```

### Step 2: Use Page Token to Query Instagram

**Now in Graph API Explorer:**

1. **Paste the Page Access Token** (from step 1) into the "Access Token" field at the top

2. **Change dropdown** from "User Token" to **"Page Token"** (if available) OR just use the page token directly

3. **Query the Instagram account:**
   ```
   17841473888497604?fields=username,name,account_type,followers_count
   ```
   (Use the `instagram_business_account.id` from step 1)

4. **Click "Submit"**

5. **If it works:** ✅ Instagram account is linked and accessible!

---

## 🎯 Alternative: Direct Query with Page Token

**Once you have the Page Access Token:**

1. **Paste Page Token** in Access Token field

2. **Query:**
   ```
   650073251534023/page_backed_instagram_accounts
   ```

3. **Should work now!** ✅

---

## 📝 What to Look For

**If Instagram is linked, you'll see:**
```json
{
  "data": [
    {
      "id": "17841473888497604",
      "username": "90sauthentickitchen"
    }
  ]
}
```

**If NOT linked, you'll see:**
```json
{
  "data": []
}
```

---

## ✅ Next Steps

Once you confirm the Instagram account ID:

1. **Update 90's account in dashboard:**
   - Platform ID: `17841473888497604` (or whatever ID you get)
   - Access Token: The **Page Access Token** (not user token)
   - Save

2. **Test report generation** - should work now!

---

**Key Point:** For Instagram queries, you need the **Page Access Token** from `me/accounts`, NOT the User Token from the top panel!
