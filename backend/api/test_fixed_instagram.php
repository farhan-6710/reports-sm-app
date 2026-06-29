<?php
/**
 * Test Fixed Instagram Insights
 * Verifies that the fixes work correctly
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');

require_once __DIR__ . '/../services/InstagramService.php';

// Access token
$accessToken = 'EAATy7qAW3EoBQLpL5ETzSOkPtIZBidP9axvp9fAXJzolJciSnxVSWr5P6h4g6ZACa3d3bO62UCoChATXnYLdnUV3QxZAl3xOMlqYUh39qefuI0Lkh7YzjJ03FRKZAFjNHVrYY0wy941paR8uLLZBcklFZAZAujMZBJTIUF1JFCqRZAuZAAK3fKMgs7wVBpkLZCJI3L1WaKAo24LXOmKOvYZCbyRseAFos2eVZCc3kDIKAZBL8WPgXGZBL5GyORZAcLxExn3O1wxT6ZCkqX4QhR5GopdIpUP5q';

// Test with first Instagram ID
$testAccountId = '17841408769245289'; // malnadukitchen

// Date range: last 7 days
$endDate = date('Y-m-d');
$startDate = date('Y-m-d', strtotime('-7 days'));

$results = [
    'test_account_id' => $testAccountId,
    'date_range' => "$startDate to $endDate",
    'tests' => []
];

try {
    $instagramService = new InstagramService($accessToken);
    
    // Test 1: Get Account Info
    $results['tests']['account_info'] = [
        'status' => 'testing',
        'data' => null
    ];
    
    try {
        $accountInfo = $instagramService->getAccountInfo($testAccountId);
        $results['tests']['account_info'] = [
            'status' => 'SUCCESS',
            'data' => $accountInfo
        ];
    } catch (Exception $e) {
        $results['tests']['account_info'] = [
            'status' => 'FAILED',
            'error' => $e->getMessage()
        ];
    }
    
    // Test 2: Get Account Insights
    $results['tests']['account_insights'] = [
        'status' => 'testing',
        'data' => null
    ];
    
    try {
        // Use reflection to access private method for testing
        $reflection = new ReflectionClass($instagramService);
        $method = $reflection->getMethod('getAccountLevelInsights');
        $method->setAccessible(true);
        
        $accountInsights = $method->invoke($instagramService, $testAccountId, $startDate, $endDate);
        
        $results['tests']['account_insights'] = [
            'status' => 'SUCCESS',
            'data' => $accountInsights,
            'has_reach' => isset($accountInsights['reach']) && $accountInsights['reach'] !== null,
            'has_profile_views' => isset($accountInsights['profile_visits']) && $accountInsights['profile_visits'] !== null,
            'has_website_clicks' => isset($accountInsights['website_clicks']) && $accountInsights['website_clicks'] !== null,
            'has_total_interactions' => isset($accountInsights['total_interactions']) && $accountInsights['total_interactions'] !== null
        ];
    } catch (Exception $e) {
        $results['tests']['account_insights'] = [
            'status' => 'FAILED',
            'error' => $e->getMessage()
        ];
    }
    
    // Test 3: Get Recent Media
    $results['tests']['recent_media'] = [
        'status' => 'testing',
        'data' => null
    ];
    
    try {
        $media = $instagramService->getRecentMedia($testAccountId, 5);
        $results['tests']['recent_media'] = [
            'status' => 'SUCCESS',
            'count' => count($media),
            'data' => $media
        ];
    } catch (Exception $e) {
        $results['tests']['recent_media'] = [
            'status' => 'FAILED',
            'error' => $e->getMessage()
        ];
    }
    
    // Test 4: Get Full Account Insights (main method)
    $results['tests']['full_account_insights'] = [
        'status' => 'testing',
        'data' => null
    ];
    
    try {
        $fullInsights = $instagramService->getAccountInsights($testAccountId, $startDate, $endDate);
        
        $organic = $fullInsights['organic'] ?? [];
        
        $results['tests']['full_account_insights'] = [
            'status' => 'SUCCESS',
            'organic' => [
                'username' => $organic['username'] ?? 'N/A',
                'followers' => $organic['followers'] ?? 0,
                'reach' => $organic['reach'] ?? null,
                'impressions' => $organic['impressions'] ?? null,
                'profile_visits' => $organic['profile_visits'] ?? null,
                'website_clicks' => $organic['website_clicks'] ?? null,
                'total_interactions' => $organic['total_interactions'] ?? null,
                'total_views' => $organic['total_views'] ?? 0,
                'posts_count' => $organic['posts_count'] ?? 0
            ],
            'has_real_data' => (
                ($organic['reach'] ?? null) !== null ||
                ($organic['profile_visits'] ?? null) !== null ||
                ($organic['total_views'] ?? 0) > 0
            )
        ];
    } catch (Exception $e) {
        $results['tests']['full_account_insights'] = [
            'status' => 'FAILED',
            'error' => $e->getMessage()
        ];
    }
    
} catch (Exception $e) {
    $results['error'] = $e->getMessage();
}

echo json_encode($results, JSON_PRETTY_PRINT);
?>

















