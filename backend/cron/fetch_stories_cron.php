#!/usr/bin/env php
<?php
/**
 * Cron job script to automatically fetch and store Instagram stories
 * 
 * This script should be run periodically (every 12-24 hours) to capture
 * stories before they expire. Stories expire after 24 hours.
 * 
 * Setup cron job:
 * Add to crontab (crontab -e):
 * 0 */12 * * * /usr/bin/php /path/to/backend/cron/fetch_stories_cron.php >> /path/to/logs/stories_cron.log 2>&1
 * 
 * This runs every 12 hours
 */

// Set working directory
chdir(__DIR__ . '/..');

// Include required files
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../services/InstagramService.php';
require_once __DIR__ . '/../utils/crypto.php';

// Log start
$logFile = __DIR__ . '/../logs/stories_cron.log';
$logDir = dirname($logFile);
if (!is_dir($logDir)) {
    mkdir($logDir, 0755, true);
}

function logMessage($message) {
    global $logFile;
    $timestamp = date('Y-m-d H:i:s');
    $logMessage = "[$timestamp] $message\n";
    file_put_contents($logFile, $logMessage, FILE_APPEND);
    echo $logMessage;
}

logMessage("Starting stories fetch cron job");

try {
    $db = new Database();
    $conn = $db->getConnection();
    
    // Get all active Instagram accounts
    $stmt = $conn->prepare("SELECT * FROM accounts WHERE platform = 'instagram' AND is_active = 1");
    $stmt->execute();
    $accounts = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($accounts)) {
        logMessage("No active Instagram accounts found");
        exit(0);
    }
    
    logMessage("Found " . count($accounts) . " active Instagram account(s)");
    
    $totalStoriesFetched = 0;
    
    foreach ($accounts as $account) {
        try {
            logMessage("Processing account: " . $account['account_name']);
            
            $accessToken = decryptToken($account['access_token']);
            $service = new InstagramService($accessToken);
            
            // Get active stories
            $stories = $service->getRecentStories($account['account_id']);
            
            if (empty($stories)) {
                logMessage("No active stories found for account: " . $account['account_name']);
                continue;
            }
            
            logMessage("Found " . count($stories) . " active stories for " . $account['account_name']);
            
            // Get stories with metrics
            $storiesWithMetrics = $service->getAllStoriesWithMetrics($stories);
            
            // Store each story in database
            $insertStmt = $conn->prepare("
                INSERT INTO instagram_stories_archive (
                    account_id, story_id, media_type, media_url, thumbnail_url, permalink,
                    timestamp, impressions, reach, replies, taps_forward, taps_back,
                    exits, link_clicks, engagement, completion_rate, insights_data
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ON DUPLICATE KEY UPDATE
                    impressions = VALUES(impressions),
                    reach = VALUES(reach),
                    replies = VALUES(replies),
                    taps_forward = VALUES(taps_forward),
                    taps_back = VALUES(taps_back),
                    exits = VALUES(exits),
                    link_clicks = VALUES(link_clicks),
                    engagement = VALUES(engagement),
                    completion_rate = VALUES(completion_rate),
                    insights_data = VALUES(insights_data),
                    updated_at = NOW()
            ");
            
            $storiesStored = 0;
            foreach ($storiesWithMetrics as $story) {
                try {
                    $insertStmt->execute([
                        $account['account_id'],
                        $story['id'],
                        $story['media_type'] ?? 'IMAGE',
                        $story['media_url'] ?? '',
                        $story['thumbnail_url'] ?? '',
                        $story['permalink'] ?? '',
                        $story['timestamp'] ?? date('Y-m-d H:i:s'),
                        $story['impressions'] ?? 0,
                        $story['reach'] ?? 0,
                        $story['replies'] ?? 0,
                        $story['taps_forward'] ?? 0,
                        $story['taps_back'] ?? 0,
                        $story['exits'] ?? 0,
                        $story['link_clicks'] ?? 0,
                        $story['engagement'] ?? 0,
                        $story['completion_rate'] ?? 0,
                        json_encode($story)
                    ]);
                    $storiesStored++;
                } catch (Exception $e) {
                    logMessage("Error storing story {$story['id']}: " . $e->getMessage());
                }
            }
            
            $totalStoriesFetched += $storiesStored;
            logMessage("Stored $storiesStored stories for account: " . $account['account_name']);
            
        } catch (Exception $e) {
            logMessage("Error fetching stories for account {$account['account_name']}: " . $e->getMessage());
        }
    }
    
    logMessage("Cron job completed. Total stories fetched: $totalStoriesFetched");
    exit(0);
    
} catch (Exception $e) {
    logMessage("Fatal error in cron job: " . $e->getMessage());
    exit(1);
}
?>

