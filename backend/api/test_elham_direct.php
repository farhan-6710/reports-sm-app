<?php
/**
 * Direct test for Elham account - Add account and test endpoints via HTTP
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/crypto.php';

header('Content-Type: application/json');

// Test credentials
$testCredentials = [
    'name' => 'Elham School',
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
    
    // Step 2: Test Organic Report Endpoint via HTTP
    $results['step2'] = 'Testing Organic Report API via HTTP...';
    
    $startDate = date('Y-m-d', strtotime('-30 days'));
    $endDate = date('Y-m-d');
    
    $postData = json_encode([
        'accountId' => $accountId,
        'startDate' => $startDate,
        'endDate' => $endDate,
        'includePosts' => true,
        'includeStories' => true,
        'postsLimit' => 25
    ]);
    
    $ch = curl_init('http://localhost:8000/api/organic_report.php');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_TIMEOUT, 180);
    
    $organicResponse = curl_exec($ch);
    $organicHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $organicError = curl_error($ch);
    if (function_exists('curl_close')) {
        curl_close($ch);
    }
    
    if ($organicError) {
        $results['step2_result'] = 'CURL ERROR';
        $results['step2_error'] = $organicError;
    } else {
        $organicResult = json_decode($organicResponse, true);
        
        if ($organicResult && isset($organicResult['success'])) {
            if ($organicResult['success']) {
                $results['step2_result'] = 'SUCCESS';
                $results['step2_data'] = [
                    'has_account_stats' => !empty($organicResult['data']['account_stats']),
                    'has_engagement' => !empty($organicResult['data']['engagement']),
                    'posts_count' => count($organicResult['data']['content_posts'] ?? []),
                    'stories_count' => count($organicResult['data']['stories']['stories_list'] ?? []),
                    'account_stats' => $organicResult['data']['account_stats'] ?? null,
                    'engagement' => $organicResult['data']['engagement'] ?? null
                ];
            } else {
                $results['step2_result'] = 'FAILED';
                $results['step2_error'] = $organicResult['error'] ?? 'Unknown error';
                $results['step2_response'] = $organicResponse;
            }
        } else {
            $results['step2_result'] = 'INVALID_RESPONSE';
            $results['step2_response'] = $organicResponse;
            $results['step2_http_code'] = $organicHttpCode;
        }
    }
    
    // Step 3: Test Content Performance Report Endpoint via HTTP
    $results['step3'] = 'Testing Content Performance Report API via HTTP...';
    
    $postsPostData = json_encode([
        'accountId' => $accountId,
        'startDate' => $startDate,
        'endDate' => $endDate,
        'limit' => 10
    ]);
    
    $ch = curl_init('http://localhost:8000/api/posts_report.php');
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $postsPostData);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_TIMEOUT, 180);
    
    $postsResponse = curl_exec($ch);
    $postsHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $postsError = curl_error($ch);
    if (function_exists('curl_close')) {
        curl_close($ch);
    }
    
    if ($postsError) {
        $results['step3_result'] = 'CURL ERROR';
        $results['step3_error'] = $postsError;
    } else {
        $postsResult = json_decode($postsResponse, true);
        
        if ($postsResult && isset($postsResult['success'])) {
            if ($postsResult['success']) {
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
                $results['step3_response'] = $postsResponse;
            }
        } else {
            $results['step3_result'] = 'INVALID_RESPONSE';
            $results['step3_response'] = $postsResponse;
            $results['step3_http_code'] = $postsHttpCode;
        }
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

