<?php
/**
 * Direct Token Test - Bypass database encryption
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$accessToken = 'EAATy7qAW3EoBQLpL5ETzSOkPtIZBidP9axvp9fAXJzolJciSnxVSWr5P6h4g6ZACa3d3bO62UCoChATXnYLdnUV3QxZAl3xOMlqYUh39qefuI0Lkh7YzjJ03FRKZAFjNHVrYY0wy941paR8uLLZBcklFZAZAujMZBJTIUF1JFCqZAuZAAK3fKMgs7wVBpkLZCJI3L1WaKAo24LXOmKOvYZCbyRseAFos2eVZCc3kDIKAZBL8WPgXGZBL5GyORZAcLxExn3O1wxT6ZCkqX4QhR5GopdIpUP5q';
$apiVersion = 'v19.0';

$testAccountId = '17841408769245289'; // malnadukitchen

$results = [];

// Test 1: Account Info
$url = "https://graph.facebook.com/{$apiVersion}/{$testAccountId}";
$params = [
    'fields' => 'username,name,account_type,followers_count,media_count',
    'access_token' => $accessToken
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$data = json_decode($response, true);
$results['account_info'] = [
    'http_code' => $httpCode,
    'success' => $httpCode === 200 && !isset($data['error']),
    'data' => $data
];

// Test 2: Account Insights
$sinceUnix = strtotime('-30 days');
$untilUnix = strtotime('now');

$url = "https://graph.facebook.com/{$apiVersion}/{$testAccountId}/insights";
$params = [
    'metric' => 'reach,profile_views,accounts_engaged,total_interactions',
    'period' => 'day',
    'since' => $sinceUnix,
    'until' => $untilUnix,
    'access_token' => $accessToken
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$data = json_decode($response, true);
$results['account_insights'] = [
    'http_code' => $httpCode,
    'success' => $httpCode === 200 && !isset($data['error']),
    'data' => $data,
    'has_values' => false
];

if ($results['account_insights']['success'] && isset($data['data'])) {
    foreach ($data['data'] as $metric) {
        if (isset($metric['values']) && count($metric['values']) > 0) {
            foreach ($metric['values'] as $value) {
                if (($value['value'] ?? 0) > 0) {
                    $results['account_insights']['has_values'] = true;
                    break 2;
                }
            }
        }
    }
}

// Test 3: Media
$url = "https://graph.facebook.com/{$apiVersion}/{$testAccountId}/media";
$params = [
    'fields' => 'id,caption,media_type,like_count,comments_count,timestamp',
    'limit' => 5,
    'access_token' => $accessToken
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 30);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$data = json_decode($response, true);
$results['media'] = [
    'http_code' => $httpCode,
    'success' => $httpCode === 200 && !isset($data['error']),
    'data' => $data,
    'posts_count' => isset($data['data']) ? count($data['data']) : 0
];

// Test 4: Media Insights (if we have posts)
if ($results['media']['success'] && isset($data['data'][0]['id'])) {
    $mediaId = $data['data'][0]['id'];
    
    $url = "https://graph.facebook.com/{$apiVersion}/{$mediaId}/insights";
    $params = [
        'metric' => 'impressions,reach,engagement,saved',
        'period' => 'lifetime',
        'access_token' => $accessToken
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 30);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    $insightsData = json_decode($response, true);
    $results['media_insights'] = [
        'http_code' => $httpCode,
        'success' => $httpCode === 200 && !isset($insightsData['error']),
        'data' => $insightsData,
        'has_values' => false
    ];
    
    if ($results['media_insights']['success'] && isset($insightsData['data'])) {
        foreach ($insightsData['data'] as $metric) {
            $value = $metric['values'][0]['value'] ?? 0;
            if ($value > 0) {
                $results['media_insights']['has_values'] = true;
                break;
            }
        }
    }
}

echo json_encode($results, JSON_PRETTY_PRINT);
?>

















