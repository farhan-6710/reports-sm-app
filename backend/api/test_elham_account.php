<?php
/**
 * Test script for Elham account - Add account and test endpoints
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/crypto.php';

header('Content-Type: application/json');

// Test credentials
$testCredentials = [
    'name' => 'Elham',
    'instagram_id' => '17841472119348822',
    'ad_account_id' => '1845732446345888',
    'access_token' => 'EAATy7qAW3EoBQR0JsUeTYMvvPTAcgMHUAaZBmoZCl5NL1NT5mng6ZAECxZBrxEh8hYUg7OPJFeSQyMAWJ5J9g4oBF2tDs6HWkHOOXw14W8KxvBWSlyPLa5JZB3nqB8D23j2uKK2jPwDciIWX2CZCgmnfT19s64dTOxMDV2OkzuIZCaDren22IrKn6UE0LS7Y1j3Fv3ZBZBbkaNt8IQqIjOBS8Tpcu85cOsBhZAWsZBK'
];

$results = [];

try {
    $db = new Database();
    $conn = $db->getConnection();
    
    // Step 1: Add/Update Instagram account
    $results['step1'] = 'Adding/Updating Instagram account...';
    
    // Check if account exists
    $stmt = $conn->prepare("SELECT * FROM accounts WHERE account_id = ? AND platform = 'instagram'");
    $stmt->execute([$testCredentials['instagram_id']]);
    $existingAccount = $stmt->fetch(PDO::FETCH_ASSOC);
    
    $encryptedToken = encryptToken($testCredentials['access_token']);
    
    if ($existingAccount) {
        // Update existing account
        $stmt = $conn->prepare("
            UPDATE accounts 
            SET account_name = ?, access_token = ?, updated_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([
            $testCredentials['name'],
            $encryptedToken,
            $existingAccount['id']
        ]);
        $accountId = $existingAccount['id'];
        $results['step1_result'] = "Updated existing Instagram account (ID: $accountId)";
    } else {
        // Insert new account
        $stmt = $conn->prepare("
            INSERT INTO accounts (platform, account_name, account_id, access_token, is_active, created_at)
            VALUES (?, ?, ?, ?, 1, NOW())
        ");
        $stmt->execute([
            'instagram',
            $testCredentials['name'],
            $testCredentials['instagram_id'],
            $encryptedToken
        ]);
        $accountId = $conn->lastInsertId();
        $results['step1_result'] = "Created new Instagram account (ID: $accountId)";
    }
    
    $results['account_id'] = $accountId;
    $results['account_name'] = $testCredentials['name'];
    $results['instagram_id'] = $testCredentials['instagram_id'];
    
    // Step 2: Test Organic Report Endpoint
    $results['step2'] = 'Testing Organic Report API...';
    
    $startDate = date('Y-m-d', strtotime('-30 days'));
    $endDate = date('Y-m-d');
    
    // Simulate the API call
    $_SERVER['REQUEST_METHOD'] = 'POST';
    $_POST = [];
    file_put_contents('php://temp', json_encode([
        'accountId' => $accountId,
        'startDate' => $startDate,
        'endDate' => $endDate,
        'includePosts' => true,
        'includeStories' => true,
        'postsLimit' => 25
    ]));
    
    // Test by including the organic_report.php file logic
    ob_start();
    try {
        require_once __DIR__ . '/organic_report.php';
        $organicOutput = ob_get_clean();
        $organicResult = json_decode($organicOutput, true);
        
        if ($organicResult && $organicResult['success']) {
            $results['step2_result'] = 'SUCCESS';
            $results['step2_data'] = [
                'has_account_stats' => !empty($organicResult['data']['account_stats']),
                'has_engagement' => !empty($organicResult['data']['engagement']),
                'posts_count' => count($organicResult['data']['content_posts'] ?? []),
                'stories_count' => count($organicResult['data']['stories']['stories_list'] ?? [])
            ];
        } else {
            $results['step2_result'] = 'FAILED';
            $results['step2_error'] = $organicResult['error'] ?? 'Unknown error';
        }
    } catch (Exception $e) {
        ob_end_clean();
        $results['step2_result'] = 'ERROR';
        $results['step2_error'] = $e->getMessage();
        $results['step2_trace'] = $e->getTraceAsString();
    }
    
    // Step 3: Test Content Performance Report Endpoint
    $results['step3'] = 'Testing Content Performance Report API...';
    
    ob_start();
    try {
        // Reset for posts_report.php
        $_SERVER['REQUEST_METHOD'] = 'POST';
        file_put_contents('php://temp', json_encode([
            'accountId' => $accountId,
            'startDate' => $startDate,
            'endDate' => $endDate,
            'limit' => 10
        ]));
        
        require_once __DIR__ . '/posts_report.php';
        $postsOutput = ob_get_clean();
        $postsResult = json_decode($postsOutput, true);
        
        if ($postsResult && $postsResult['success']) {
            $results['step3_result'] = 'SUCCESS';
            $results['step3_data'] = [
                'total_posts' => $postsResult['data']['total_posts'] ?? 0,
                'total_stories' => $postsResult['data']['total_stories'] ?? 0,
                'has_posts' => !empty($postsResult['data']['posts']),
                'has_stories' => !empty($postsResult['data']['stories'])
            ];
        } else {
            $results['step3_result'] = 'FAILED';
            $results['step3_error'] = $postsResult['error'] ?? 'Unknown error';
        }
    } catch (Exception $e) {
        ob_end_clean();
        $results['step3_result'] = 'ERROR';
        $results['step3_error'] = $e->getMessage();
        $results['step3_trace'] = $e->getTraceAsString();
    }
    
    echo json_encode([
        'success' => true,
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






