<?php
/**
 * Auto-Fix and Test Instagram Insights
 * This script will:
 * 1. Test all accounts with the provided token
 * 2. Identify issues
 * 3. Apply fixes automatically
 * 4. Return real data
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../services/InstagramService.php';
require_once __DIR__ . '/../utils/crypto.php';

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$newToken = 'EAATy7qAW3EoBQLpL5ETzSOkPtIZBidP9axvp9fAXJzolJciSnxVSWr5P6h4g6ZACa3d3bO62UCoChATXnYLdnUV3QxZAl3xOMlqYUh39qefuI0Lkh7YzjJ03FRKZAFjNHVrYY0wy941paR8uLLZBcklFZAZAujMZBJTIUF1JFCqZAuZAAK3fKMgs7wVBpkLZCJI3L1WaKAo24LXOmKOvYZCbyRseAFos2eVZCc3kDIKAZBL8WPgXGZBL5GyORZAcLxExn3O1wxT6ZCkqX4QhR5GopdIpUP5q';

$accounts = [
    ['name' => 'malnadukitchen', 'id' => '17841408769245289'],
    ['name' => 'alaterracelounge', 'id' => '17841417697310086'],
    ['name' => 'kulture_sportsbar', 'id' => '17841417527669773'],
];

$results = [];

try {
    $db = new Database();
    $conn = $db->getConnection();
    
    // Update tokens for test accounts
    foreach ($accounts as $account) {
        $accountId = $account['id'];
        $accountName = $account['name'];
        
        // Encrypt and update token
        require_once __DIR__ . '/../utils/crypto.php';
        $encryptedToken = encryptToken($newToken);
        
        // Update account in database
        $stmt = $conn->prepare("UPDATE accounts SET access_token = ? WHERE account_id = ? AND platform = 'instagram'");
        $stmt->execute([$encryptedToken, $accountId]);
        
        // Test with the service
        $service = new InstagramService($newToken);
        
        $accountResult = [
            'account_name' => $accountName,
            'account_id' => $accountId,
            'token_updated' => true
        ];
        
        // Test account info
        try {
            $accountInfo = $service->getAccountInfo($accountId);
            $accountResult['account_info'] = [
                'success' => true,
                'username' => $accountInfo['username'] ?? null,
                'followers' => $accountInfo['followers_count'] ?? 0
            ];
        } catch (Exception $e) {
            $accountResult['account_info'] = [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
        
        // Test insights with expanded date range
        $startDate = date('Y-m-d', strtotime('-90 days'));
        $endDate = date('Y-m-d');
        
        try {
            $insights = $service->getAccountInsights($accountId, $startDate, $endDate);
            $accountResult['insights'] = [
                'success' => true,
                'data' => $insights['organic'] ?? []
            ];
        } catch (Exception $e) {
            $accountResult['insights'] = [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
        
        // Test posts
        try {
            $followers = $accountResult['account_info']['followers'] ?? 0;
            $posts = $service->getDetailedPostsReport($accountId, $followers, 5);
            $accountResult['posts'] = [
                'success' => true,
                'count' => count($posts),
                'sample' => array_slice($posts, 0, 2)
            ];
        } catch (Exception $e) {
            $accountResult['posts'] = [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
        
        $results[] = $accountResult;
    }
    
    echo json_encode([
        'success' => true,
        'message' => 'Tokens updated and tested',
        'results' => $results
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], JSON_PRETTY_PRINT);
}
?>

















