<?php
/**
 * Local Test Endpoint for Instagram Insights
 * Access via: http://localhost:8000/api/test_instagram_local.php
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST');
header('Access-Control-Allow-Headers: Content-Type');

require_once __DIR__ . '/../services/InstagramService.php';

// Get parameters from query string or POST
$accessToken = $_GET['token'] ?? $_POST['token'] ?? '';
$accountId = $_GET['account_id'] ?? $_POST['account_id'] ?? '17841408769245289'; // Default: malnadukitchen
$days = intval($_GET['days'] ?? $_POST['days'] ?? 7);

// Date range: last N days
$endDate = date('Y-m-d');
$startDate = date('Y-m-d', strtotime("-$days days"));

$results = [
    'status' => 'testing',
    'account_id' => $accountId,
    'date_range' => "$startDate to $endDate",
    'access_token_provided' => !empty($accessToken),
    'tests' => []
];

if (empty($accessToken)) {
    $results['error'] = 'Access token required. Add ?token=YOUR_TOKEN to URL';
    $results['usage'] = 'http://localhost:8000/api/test_instagram_local.php?token=YOUR_TOKEN&account_id=17841408769245289&days=7';
    echo json_encode($results, JSON_PRETTY_PRINT);
    exit;
}

try {
    $instagramService = new InstagramService($accessToken);
    
    // Test 1: Get Account Info
    $results['tests']['account_info'] = [
        'status' => 'testing',
        'data' => null
    ];
    
    try {
        $accountInfo = $instagramService->getAccountInfo($accountId);
        $results['tests']['account_info'] = [
            'status' => 'SUCCESS',
            'data' => $accountInfo,
            'username' => $accountInfo['username'] ?? 'N/A',
            'followers' => $accountInfo['followers_count'] ?? 0
        ];
    } catch (Exception $e) {
        $results['tests']['account_info'] = [
            'status' => 'FAILED',
            'error' => $e->getMessage()
        ];
    }
    
    // Test 2: Get Account-Level Insights (using reflection to access private method)
    $results['tests']['account_insights'] = [
        'status' => 'testing',
        'data' => null
    ];
    
    try {
        $reflection = new ReflectionClass($instagramService);
        $method = $reflection->getMethod('getAccountLevelInsights');
        if (PHP_VERSION_ID < 80500) {
            $method->setAccessible(true);
        }
        
        $accountInsights = $method->invoke($instagramService, $accountId, $startDate, $endDate);
        
        $results['tests']['account_insights'] = [
            'status' => 'SUCCESS',
            'data' => $accountInsights,
            'has_reach' => isset($accountInsights['reach']) && $accountInsights['reach'] !== null,
            'has_profile_views' => isset($accountInsights['profile_visits']) && $accountInsights['profile_visits'] !== null,
            'has_website_clicks' => isset($accountInsights['website_clicks']) && $accountInsights['website_clicks'] !== null,
            'has_total_interactions' => isset($accountInsights['total_interactions']) && $accountInsights['total_interactions'] !== null,
            'metrics_summary' => [
                'reach' => $accountInsights['reach'] ?? 'null',
                'profile_visits' => $accountInsights['profile_visits'] ?? 'null',
                'website_clicks' => $accountInsights['website_clicks'] ?? 'null',
                'total_interactions' => $accountInsights['total_interactions'] ?? 'null'
            ]
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
        $media = $instagramService->getRecentMedia($accountId, 5);
        $results['tests']['recent_media'] = [
            'status' => 'SUCCESS',
            'count' => count($media),
            'sample_post' => !empty($media) ? [
                'id' => $media[0]['id'] ?? 'N/A',
                'type' => $media[0]['media_type'] ?? 'N/A',
                'likes' => $media[0]['like_count'] ?? 0,
                'comments' => $media[0]['comments_count'] ?? 0
            ] : null
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
        $fullInsights = $instagramService->getAccountInsights($accountId, $startDate, $endDate);
        
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
                'posts_count' => $organic['posts_count'] ?? 0,
                'total_likes' => $organic['total_likes'] ?? 0,
                'total_comments' => $organic['total_comments'] ?? 0
            ],
            'has_real_data' => (
                ($organic['reach'] ?? null) !== null ||
                ($organic['profile_visits'] ?? null) !== null ||
                ($organic['total_views'] ?? 0) > 0 ||
                ($organic['total_likes'] ?? 0) > 0
            )
        ];
    } catch (Exception $e) {
        $results['tests']['full_account_insights'] = [
            'status' => 'FAILED',
            'error' => $e->getMessage()
        ];
    }
    
    $results['status'] = 'completed';
    $results['summary'] = [
        'all_tests_passed' => (
            $results['tests']['account_info']['status'] === 'SUCCESS' &&
            $results['tests']['account_insights']['status'] === 'SUCCESS' &&
            $results['tests']['recent_media']['status'] === 'SUCCESS' &&
            $results['tests']['full_account_insights']['status'] === 'SUCCESS'
        ),
        'has_real_data' => $results['tests']['full_account_insights']['has_real_data'] ?? false
    ];
    
} catch (Exception $e) {
    $results['status'] = 'error';
    $results['error'] = $e->getMessage();
}

echo json_encode($results, JSON_PRETTY_PRINT);
?>

















