<?php
/**
 * Test All Instagram Accounts with Provided Token
 * Tests all account IDs to verify API calls work
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$accessToken = 'EAATy7qAW3EoBQB2Mtt9oxFQbkp0ouirxJ4wVrwQZAIXY6dy0bdme4rQqVLNdFLcTZALHDOaLt0FbeOJ1QLuUWs5wPZBA9xcjiZAoh6XBlUZCUp17PiOA4dZAlcALZA3PP9rZB8tw6d48NyLVxSI5imAcddSCSXhtYZBEJLjAeCjTIu9EQGVWuXKCyKh6J5wSnublZCEmxKwhZAGqzDDSCG3LtAVUXj4V9cFOZC7SJzqYXWZARFBzI38wiIL2ZBjsjyHrzsyZBkqZBZCzRlGZBGPWetlesuTmjB';

$accounts = [
    ['name' => 'malnadukitchen', 'id' => '17841408769245289'],
    ['name' => 'alaterracelounge', 'id' => '17841417697310086'],
    ['name' => 'kulture_sportsbar', 'id' => '17841417527669773'],
    ['name' => 'otc.kompally', 'id' => '17841453683516805'],
    ['name' => 'raas_academy_', 'id' => '17841474063739857'],
    ['name' => 'i.am.beinngself', 'id' => '17841470724710223'],
    ['name' => 'aromasandco_', 'id' => '17841477274203754'],
    ['name' => 'villionairesofficial', 'id' => '17841465257655312'],
    ['name' => 'blossifiore', 'id' => '17841477658018366'],
    ['name' => 'elhamtheschool', 'id' => '17841472119348822'],
    ['name' => 'kunda_chai_com', 'id' => '17841466930025682'],
    ['name' => 'armario.pro', 'id' => '17841476214409160'],
    ['name' => 'instashoot_by_dc', 'id' => '17841476673700469'],
    ['name' => '90sauthentickitchen', 'id' => '17841473888497604'],
    ['name' => 'digicarotene_academy', 'id' => '17841476143845943'],
    ['name' => 'knotara_macrame', 'id' => '17841467648484325'],
    ['name' => 'tecorarestaurant', 'id' => '17841472835004206']
];

$results = [];
$apiVersion = 'v19.0';

// Test date range (last 30 days)
$endDate = date('Y-m-d');
$startDate = date('Y-m-d', strtotime('-30 days'));
$sinceUnix = strtotime($startDate);
$untilUnix = strtotime($endDate);

foreach ($accounts as $account) {
    $accountId = $account['id'];
    $accountName = $account['name'];
    
    $accountResult = [
        'account_name' => $accountName,
        'account_id' => $accountId,
        'tests' => []
    ];
    
    // Test 1: Account Info
    $url = "https://graph.facebook.com/{$apiVersion}/{$accountId}";
    $params = [
        'fields' => 'username,name,followers_count,media_count,profile_picture_url',
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
    
    $accountResult['tests']['account_info'] = [
        'success' => $httpCode === 200 && !isset($data['error']),
        'http_code' => $httpCode,
        'error' => $data['error'] ?? null,
        'username' => $data['username'] ?? null,
        'followers' => $data['followers_count'] ?? null
    ];
    
    // Test 2: Account Insights
    $url = "https://graph.facebook.com/{$apiVersion}/{$accountId}/insights";
    $params = [
        'metric' => 'impressions,reach,profile_views',
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
    
    $accountResult['tests']['account_insights'] = [
        'success' => $httpCode === 200 && !isset($data['error']),
        'http_code' => $httpCode,
        'error' => $data['error'] ?? null,
        'metrics_count' => isset($data['data']) ? count($data['data']) : 0
    ];
    
    // Test 3: Media (Posts)
    $url = "https://graph.facebook.com/{$apiVersion}/{$accountId}/media";
    $params = [
        'fields' => 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count',
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
    
    $accountResult['tests']['media'] = [
        'success' => $httpCode === 200 && !isset($data['error']),
        'http_code' => $httpCode,
        'error' => $data['error'] ?? null,
        'posts_count' => isset($data['data']) ? count($data['data']) : 0
    ];
    
    $results[] = $accountResult;
}

echo json_encode([
    'success' => true,
    'total_accounts' => count($accounts),
    'date_range' => ['start' => $startDate, 'end' => $endDate],
    'results' => $results
], JSON_PRETTY_PRINT);
?>
