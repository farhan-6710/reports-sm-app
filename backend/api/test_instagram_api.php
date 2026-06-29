<?php
/**
 * Test Instagram API Calls
 * Use this to verify API calls work with the provided token and account IDs
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$accessToken = $_GET['token'] ?? 'EAATy7qAW3EoBQB2Mtt9oxFQbkp0ouirxJ4wVrwQZAIXY6dy0bdme4rQqVLNdFLcTZALHDOaLt0FbeOJ1QLuUWs5wPZBA9xcjiZAoh6XBlUZCUp17PiOA4dZAlcALZA3PP9rZB8tw6d48NyLVxSI5imAcddSCSXhtYZBEJLjAeCjTIu9EQGVWuXKCyKh6J5wSnublZCEmxKwhZAGqzDDSCG3LtAVUXj4V9cFOZC7SJzqYXWZARFBzI38wiIL2ZBjsjyHrzsyZBkqZBZCzRlGZBGPWetlesuTmjB';
$accountId = $_GET['account_id'] ?? '17841408769245289'; // malnadukitchen
$apiVersion = $_GET['api_version'] ?? 'v19.0';

// Test date range (last 30 days)
$endDate = date('Y-m-d');
$startDate = date('Y-m-d', strtotime('-30 days'));
$sinceUnix = strtotime($startDate);
$untilUnix = strtotime($endDate);

$results = [];

// Test 1: Get Account Info
$results['test1_account_info'] = testAccountInfo($accountId, $accessToken, $apiVersion);

// Test 2: Get Account Insights (multiple metrics in one call)
$results['test2_account_insights'] = testAccountInsights($accountId, $accessToken, $apiVersion, $sinceUnix, $untilUnix);

// Test 3: Get Media (Posts)
$results['test3_media'] = testMedia($accountId, $accessToken, $apiVersion);

// Test 4: Get Media Insights (for first post)
if (!empty($results['test3_media']['data']['data'][0]['id'] ?? null)) {
    $mediaId = $results['test3_media']['data']['data'][0]['id'];
    $results['test4_media_insights'] = testMediaInsights($mediaId, $accessToken, $apiVersion);
}

echo json_encode($results, JSON_PRETTY_PRINT);

function testAccountInfo($accountId, $token, $version) {
    $url = "https://graph.facebook.com/{$version}/{$accountId}";
    $params = [
        'fields' => 'username,name,followers_count,media_count,profile_picture_url',
        'access_token' => $token
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    $data = json_decode($response, true);
    
    return [
        'url' => $url,
        'http_code' => $httpCode,
        'curl_error' => $curlError,
        'success' => $httpCode === 200 && !isset($data['error']),
        'data' => $data,
        'error' => $data['error'] ?? null
    ];
}

function testAccountInsights($accountId, $token, $version, $since, $until) {
    // Test with multiple metrics in one call (recommended approach)
    $url = "https://graph.facebook.com/{$version}/{$accountId}/insights";
    
    // Valid metrics for Instagram Business accounts
    $metrics = [
        'impressions',
        'reach',
        'profile_views',
        'website_clicks',
        'email_contacts',
        'phone_call_clicks',
        'text_message_clicks',
        'get_directions_clicks',
        'accounts_engaged'
    ];
    
    $params = [
        'metric' => implode(',', $metrics),
        'period' => 'day',
        'since' => $since,
        'until' => $until,
        'access_token' => $token
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    $data = json_decode($response, true);
    
    // Also test individual metrics to see which ones work
    $individualResults = [];
    foreach (['impressions', 'reach', 'profile_views'] as $metric) {
        $individualResults[$metric] = testSingleMetric($accountId, $token, $version, $metric, $since, $until);
    }
    
    return [
        'url' => $url,
        'params' => $params,
        'http_code' => $httpCode,
        'curl_error' => $curlError,
        'success' => $httpCode === 200 && !isset($data['error']),
        'data' => $data,
        'error' => $data['error'] ?? null,
        'metrics_count' => isset($data['data']) ? count($data['data']) : 0,
        'individual_tests' => $individualResults
    ];
}

function testSingleMetric($accountId, $token, $version, $metric, $since, $until) {
    $url = "https://graph.facebook.com/{$version}/{$accountId}/insights";
    $params = [
        'metric' => $metric,
        'period' => 'day',
        'since' => $since,
        'until' => $until,
        'access_token' => $token
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    $data = json_decode($response, true);
    
    return [
        'metric' => $metric,
        'http_code' => $httpCode,
        'success' => $httpCode === 200 && !isset($data['error']),
        'has_data' => isset($data['data'][0]['values']),
        'values_count' => isset($data['data'][0]['values']) ? count($data['data'][0]['values']) : 0,
        'error' => $data['error'] ?? null
    ];
}

function testMedia($accountId, $token, $version) {
    $url = "https://graph.facebook.com/{$version}/{$accountId}/media";
    $params = [
        'fields' => 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count',
        'limit' => 5,
        'access_token' => $token
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    $data = json_decode($response, true);
    
    return [
        'url' => $url,
        'http_code' => $httpCode,
        'curl_error' => $curlError,
        'success' => $httpCode === 200 && !isset($data['error']),
        'data' => $data,
        'error' => $data['error'] ?? null,
        'posts_count' => isset($data['data']) ? count($data['data']) : 0
    ];
}

function testMediaInsights($mediaId, $token, $version) {
    $url = "https://graph.facebook.com/{$version}/{$mediaId}/insights";
    $params = [
        'metric' => 'impressions,reach,engagement,saved',
        'period' => 'lifetime',
        'access_token' => $token
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);
    
    $data = json_decode($response, true);
    
    return [
        'url' => $url,
        'http_code' => $httpCode,
        'curl_error' => $curlError,
        'success' => $httpCode === 200 && !isset($data['error']),
        'data' => $data,
        'error' => $data['error'] ?? null,
        'metrics_count' => isset($data['data']) ? count($data['data']) : 0
    ];
}
?>

















