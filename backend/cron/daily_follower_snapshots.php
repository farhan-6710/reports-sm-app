<?php
/**
 * Daily Follower Snapshots Cron Job
 * Saves daily follower counts for all active Instagram accounts
 * Usage: php daily_follower_snapshots.php
 * Crontab: 0 1 * * * /usr/bin/php /path/to/daily_follower_snapshots.php
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../services/InstagramService.php';
require_once __DIR__ . '/../services/FollowerTracker.php';
require_once __DIR__ . '/../utils/crypto.php';

$db = new Database();
$conn = $db->getConnection();

// Get all active Instagram accounts
$stmt = $conn->prepare("SELECT * FROM accounts WHERE platform = 'instagram' AND is_active = 1");
$stmt->execute();
$accounts = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "[" . date('Y-m-d H:i:s') . "] Starting daily follower snapshots...\n";
echo "Found " . count($accounts) . " active Instagram accounts\n\n";

$tracker = new FollowerTracker();
$today = date('Y-m-d');
$successCount = 0;
$failCount = 0;

foreach ($accounts as $account) {
    echo "Processing: {$account['account_name']} (ID: {$account['id']})...\n";
    
    try {
        // Decrypt access token
        $accessToken = decryptToken($account['access_token']);
        if (empty($accessToken)) {
            throw new Exception("Access token is empty or could not be decrypted");
        }
        
        // Get current follower count from Instagram API
        $service = new InstagramService($accessToken);
        $accountInfo = $service->getAccountInfo($account['account_id']);
        
        if (!isset($accountInfo['followers'])) {
            throw new Exception("Follower count not available in API response");
        }
        
        $followerCount = (int)$accountInfo['followers'];
        
        // Save snapshot
        $success = $tracker->saveSnapshot($account['id'], $followerCount, $today);
        
        if ($success) {
            echo "  ✓ Saved snapshot: {$followerCount} followers\n";
            $successCount++;
        } else {
            throw new Exception("Failed to save snapshot to database");
        }
        
    } catch (Exception $e) {
        echo "  ✗ Error: " . $e->getMessage() . "\n";
        $failCount++;
        error_log("Daily follower snapshot error for account {$account['id']}: " . $e->getMessage());
    }
    
    // Small delay to avoid rate limiting
    sleep(1);
}

echo "\n[" . date('Y-m-d H:i:s') . "] Daily follower snapshots completed!\n";
echo "Success: {$successCount}, Failed: {$failCount}\n";












