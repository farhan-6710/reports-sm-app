# Database Setup Guide

## Quick Setup (Windows)

### Option 1: Using the Batch Script (Easiest)

1. **Double-click** `setup-database.bat` in the project root folder
2. Enter your MySQL root password when prompted (or press Enter if no password)
3. Wait for the setup to complete

### Option 2: Manual Setup via Command Line

1. **Open PowerShell or Command Prompt**

2. **Navigate to the project folder:**
   ```powershell
   cd "C:\Users\ROHIT\Downloads\Social Media Report\social_media_report\backend"
   ```

3. **Run MySQL command:**
   
   **If MySQL has NO password:**
   ```powershell
   mysql -u root < setup_complete_database.sql
   ```
   
   **If MySQL has a password:**
   ```powershell
   mysql -u root -p < setup_complete_database.sql
   ```
   (Enter your password when prompted)

### Option 3: Using MySQL Workbench or phpMyAdmin

1. Open MySQL Workbench or phpMyAdmin
2. Connect to your MySQL server
3. Open the file: `backend/setup_complete_database.sql`
4. Execute the entire script

## Verify Database Setup

### Check if Database Exists:
```sql
SHOW DATABASES LIKE 'social_media_reports';
```

### Check if Tables Were Created:
```sql
USE social_media_reports;
SHOW TABLES;
```

You should see these tables:
- ✅ accounts
- ✅ ad_accounts
- ✅ reports
- ✅ notifications
- ✅ oauth_states
- ✅ users
- ✅ instagram_stories_archive
- ✅ follower_snapshots
- ✅ system_token

## Configure Database Connection

Edit `backend/config/database.php` and update these values:

```php
private $host = "127.0.0.1";        // Usually 127.0.0.1 or localhost
private $db_name = "social_media_reports";  // Database name
private $username = "root";        // Your MySQL username
private $password = "123";         // Your MySQL password (change if different)
```

## Test Database Connection

After setup, test the connection:

### Via PowerShell:
```powershell
cd "C:\Users\ROHIT\Downloads\Social Media Report\social_media_report"
php -r "require 'backend/config/database.php'; \$db = new Database(); \$conn = \$db->getConnection(); echo 'Connection successful!';"
```

### Via Browser:
1. Start your backend server: `cd backend && php -S localhost:8000 router.php`
2. Visit: `http://localhost:8000/api/accounts.php`
3. You should see: `{"success":true,"data":[]}` (empty array is normal if no accounts yet)

## Troubleshooting

### Error: "Access denied for user 'root'@'localhost'"

**Solution:**
1. Check your MySQL password in `backend/config/database.php`
2. Make sure MySQL is running
3. Try connecting manually: `mysql -u root -p`

### Error: "Unknown database 'social_media_reports'"

**Solution:**
- Run the setup script again: `setup-database.bat`

### Error: "Table already exists"

**Solution:**
- This is OK! The script uses `CREATE TABLE IF NOT EXISTS`
- Your database is already set up

### MySQL Not Found

**Solution:**
1. Install MySQL from: https://dev.mysql.com/downloads/mysql/
2. Or use XAMPP/WAMP which includes MySQL
3. Make sure MySQL is added to your PATH

## What Gets Created

The setup script creates:

1. **Database**: `social_media_reports`
2. **Tables**:
   - `accounts` - Stores Instagram/Facebook organic accounts
   - `ad_accounts` - Stores Facebook ad accounts
   - `reports` - Stores generated reports
   - `notifications` - System notifications
   - `oauth_states` - OAuth authentication states
   - `users` - User accounts (for future multi-user support)
   - `instagram_stories_archive` - Archived Instagram stories
   - `follower_snapshots` - Daily follower count snapshots
   - `system_token` - System-wide access tokens

## Next Steps

After database setup:

1. ✅ Verify database connection works
2. ✅ Start backend server: `cd backend && php -S localhost:8000 router.php`
3. ✅ Start frontend: `cd frontend && npm start`
4. ✅ Open browser: `http://localhost:3000`
5. ✅ Try adding an account - it should work now!

## Need Help?

If you encounter issues:

1. Check MySQL is running: `mysql -u root -p`
2. Verify database exists: `SHOW DATABASES;`
3. Check table structure: `USE social_media_reports; SHOW TABLES;`
4. Review error messages in the backend server console












