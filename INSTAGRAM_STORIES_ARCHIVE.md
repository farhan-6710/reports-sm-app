# Instagram Stories Archive System

## Overview

Since Instagram's Graph API only provides access to **active stories** (stories currently live) and stories expire after 24 hours, we've implemented an automatic archiving system that captures story data while they're still active.

## How It Works

1. **Automatic Fetching**: A cron job runs periodically (every 12 hours) to fetch active stories and their insights
2. **Database Storage**: Stories are stored in the `instagram_stories_archive` table with all their KPIs
3. **Report Generation**: When generating reports, the system first checks the archive database, then falls back to active stories from the API

## Setup Instructions

### Step 1: Create the Database Table

Run the updated schema to create the stories archive table:

```bash
mysql -u root -p social_media_reports < backend/schema.sql
```

Or manually run the SQL:
```sql
CREATE TABLE IF NOT EXISTS instagram_stories_archive (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_id VARCHAR(255) NOT NULL,
    story_id VARCHAR(255) NOT NULL UNIQUE,
    media_type VARCHAR(50) NOT NULL,
    media_url TEXT,
    thumbnail_url TEXT,
    permalink TEXT,
    timestamp DATETIME NOT NULL,
    impressions INT DEFAULT 0,
    reach INT DEFAULT 0,
    replies INT DEFAULT 0,
    taps_forward INT DEFAULT 0,
    taps_back INT DEFAULT 0,
    exits INT DEFAULT 0,
    link_clicks INT DEFAULT 0,
    engagement INT DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0,
    insights_data JSON,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_account_id (account_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_story_id (story_id)
);
```

### Step 2: Set Up Cron Job

Add a cron job to automatically fetch stories every 12 hours:

```bash
crontab -e
```

Add this line (adjust the path to your project):
```
0 */12 * * * /usr/bin/php /path/to/backend/cron/fetch_stories_cron.php >> /path/to/logs/stories_cron.log 2>&1
```

This runs every 12 hours at the top of the hour (12:00 AM, 12:00 PM).

**Alternative**: Run every 6 hours for more frequent updates:
```
0 */6 * * * /usr/bin/php /path/to/backend/cron/fetch_stories_cron.php >> /path/to/logs/stories_cron.log 2>&1
```

### Step 3: Manual Fetch (Optional)

You can also manually trigger story fetching via API:

```bash
curl -X POST http://localhost:8000/api/fetch_stories.php
```

Or via browser:
```
http://localhost:8000/api/fetch_stories.php
```

## How Reports Work Now

1. **First**: System checks the `instagram_stories_archive` table for stories in the date range
2. **Fallback**: If no archived stories found, fetches active stories from Instagram API
3. **Result**: You get historical stories (from archive) + active stories (from API)

## Important Notes

- **Stories must be fetched while active**: The system can only capture stories while they're still live (within 24 hours)
- **Automatic updates**: If a story is already in the archive, the cron job will update its metrics
- **No retroactive data**: Stories that expired before setting up this system cannot be retrieved
- **Minimum views**: Story insights require at least 5 views to be available

## Monitoring

Check the cron job logs:
```bash
tail -f backend/logs/stories_cron.log
```

## Troubleshooting

### Stories not appearing in reports

1. Check if cron job is running: `crontab -l`
2. Check logs: `cat backend/logs/stories_cron.log`
3. Manually trigger fetch: `php backend/cron/fetch_stories_cron.php`
4. Verify database: Check if stories are in `instagram_stories_archive` table

### KPIs showing 0

- Story might be too new (wait 5-10 minutes)
- Story might have < 5 views (Instagram doesn't provide insights)
- Check server logs for API errors

## Future Enhancements

- Webhook integration for real-time story capture
- Dashboard to view archived stories
- Export archived stories data
- Analytics on archived stories performance

