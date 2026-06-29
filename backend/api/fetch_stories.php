<?php
/**
 * API endpoint to fetch and store active Instagram stories
 * This should be called periodically (via cron job) to capture stories before they expire
 * Stories expire after 24 hours, so this should run at least every 12-24 hours
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../services/InstagramService.php';
require_once __DIR__ . '/../utils/crypto.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

// Fetch and store stories for all active Instagram accounts
if ($method === 'POST' || $method === 'GET') {
    try {
        $db = new Database();
        $conn = $db->getConnection();
        
        // Get all active Instagram accounts
        $stmt = $conn->prepare("SELECT * FROM accounts WHERE platform = 'instagram' AND is_active = 1");
        $stmt->execute();
        $accounts = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        if (empty($accounts)) {
            echo json_encode([
                'success' => true,
                'message' => 'No active Instagram accounts found',
                'stories_fetched' => 0
            ]);
            exit;
        }
        
        $totalStoriesFetched = 0;
        $results = [];
        
        foreach ($accounts as $account) {
            try {
                $accessToken = decryptToken($account['access_token']);
                $service = new InstagramService($accessToken);
                
                // Get active stories
                $stories = $service->getRecentStories($account['account_id']);
                
                if (empty($stories)) {
                    error_log("No active stories found for account: " . $account['account_name']);
                    continue;
                }
                
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
                        error_log("Error storing story {$story['id']}: " . $e->getMessage());
                    }
                }
                
                $totalStoriesFetched += $storiesStored;
                $results[] = [
                    'account' => $account['account_name'],
                    'stories_fetched' => $storiesStored,
                    'total_active' => count($stories)
                ];
                
                error_log("Stored $storiesStored stories for account: " . $account['account_name']);
                
            } catch (Exception $e) {
                error_log("Error fetching stories for account {$account['account_name']}: " . $e->getMessage());
                $results[] = [
                    'account' => $account['account_name'],
                    'error' => $e->getMessage()
                ];
            }
        }
        
        echo json_encode([
            'success' => true,
            'message' => 'Stories fetched and stored successfully',
            'total_stories_fetched' => $totalStoriesFetched,
            'results' => $results
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        error_log('Error in fetch_stories: ' . $e->getMessage());
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
    exit;
}

http_response_code(404);
echo json_encode(['success' => false, 'error' => 'Endpoint not found']);
?>

