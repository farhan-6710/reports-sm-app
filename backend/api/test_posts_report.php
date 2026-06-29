<?php
/**
 * Test Posts Report Endpoint
 * Tests the posts_report.php endpoint with real account data
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../services/InstagramService.php';
require_once __DIR__ . '/../utils/crypto.php';

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$accessToken = 'EAATy7qAW3EoBQB2Mtt9oxFQbkp0ouirxJ4wVrwQZAIXY6dy0bdme4rQqVLNdFLcTZALHDOaLt0FbeOJ1QLuUWs5wPZBA9xcjiZAoh6XBlUZCUp17PiOA4dZAlcALZA3PP9rZB8tw6d48NyLVxSI5imAcddSCSXhtYZBEJLjAeCjTIu9EQGVWuXKCyKh6J5wSnublZCEmxKwhZAGqzDDSCG3LtAVUXj4V9cFOZC7SJzqYXWZARFBzI38wiIL2ZBjsjyHrzsyZBkqZBZCzRlGZBGPWetlesuTmjB';

$accountId = $_GET['account_id'] ?? '17841417697310086'; // alaterracelounge
$startDate = $_GET['startDate'] ?? date('Y-m-d', strtotime('-30 days'));
$endDate = $_GET['endDate'] ?? date('Y-m-d');
$limit = $_GET['limit'] ?? 10;

try {
    error_log("Testing posts report for account: $accountId");
    
    $service = new InstagramService($accessToken);
    
    // Test 1: Get account info
    $accountInfo = $service->getAccountInfo($accountId);
    $followers = $accountInfo['followers_count'] ?? 0;
    error_log("Account info: " . json_encode($accountInfo));
    
    // Test 2: Get detailed posts report
    $posts = $service->getDetailedPostsReport($accountId, $followers, $limit);
    error_log("Got " . count($posts) . " posts");
    
    // Filter by date range
    $filteredPosts = array_filter($posts, function($post) use ($startDate, $endDate) {
        $postDate = date('Y-m-d', strtotime($post['timestamp']));
        return $postDate >= $startDate && $postDate <= $endDate;
    });
    $filteredPosts = array_values($filteredPosts);
    
    echo json_encode([
        'success' => true,
        'account_info' => $accountInfo,
        'total_posts' => count($posts),
        'filtered_posts' => count($filteredPosts),
        'date_range' => ['start' => $startDate, 'end' => $endDate],
        'posts' => array_slice($filteredPosts, 0, 5) // Return first 5 for testing
    ], JSON_PRETTY_PRINT);
    
} catch (Exception $e) {
    http_response_code(500);
    error_log("Error in test_posts_report: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage(),
        'trace' => $e->getTraceAsString()
    ], JSON_PRETTY_PRINT);
}
?>

















