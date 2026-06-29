<?php
/**
 * Test Ad Account Currency Detection
 * Debug tool to see what currency Facebook returns
 */

header('Content-Type: application/json');

$adAccountId = $_GET['account_id'] ?? '';
$accessToken = $_GET['access_token'] ?? '';

if (empty($adAccountId) || empty($accessToken)) {
    echo json_encode([
        'error' => 'Missing parameters',
        'usage' => 'test_ad_account_currency.php?account_id=123456789&access_token=YOUR_TOKEN'
    ]);
    exit;
}

// Test 1: Get ad account info
$url = "https://graph.facebook.com/v18.0/act_{$adAccountId}";
$params = [
    'fields' => 'id,name,currency,account_status',
    'access_token' => $accessToken
];

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$accountInfo = json_decode($response, true);

// Test 2: Get a campaign with insights
$url2 = "https://graph.facebook.com/v18.0/act_{$adAccountId}/campaigns";
$params2 = [
    'fields' => 'id,name,insights{account_currency,spend,cpc,cpm}',
    'access_token' => $accessToken,
    'limit' => 1
];

$ch2 = curl_init();
curl_setopt($ch2, CURLOPT_URL, $url2 . '?' . http_build_query($params2));
curl_setopt($ch2, CURLOPT_RETURNTRANSFER, true);

$response2 = curl_exec($ch2);
curl_close($ch2);

$campaignData = json_decode($response2, true);

echo json_encode([
    'test1_ad_account_info' => [
        'http_code' => $httpCode,
        'status' => $httpCode === 200 ? '✅ SUCCESS' : '❌ FAILED',
        'currency_from_account' => $accountInfo['currency'] ?? 'NOT FOUND',
        'account_name' => $accountInfo['name'] ?? 'NOT FOUND',
        'full_response' => $accountInfo
    ],
    'test2_campaign_insights_currency' => [
        'status' => isset($campaignData['data'][0]) ? '✅ Has Data' : '❌ No Data',
        'campaign_name' => $campaignData['data'][0]['name'] ?? 'N/A',
        'currency_from_insights' => $campaignData['data'][0]['insights']['data'][0]['account_currency'] ?? 'NOT FOUND',
        'spend_raw' => $campaignData['data'][0]['insights']['data'][0]['spend'] ?? 'N/A',
        'cpc_raw' => $campaignData['data'][0]['insights']['data'][0]['cpc'] ?? 'N/A',
        'full_response' => $campaignData
    ],
    'diagnosis' => [
        'account_level_currency' => $accountInfo['currency'] ?? 'MISSING',
        'insights_level_currency' => $campaignData['data'][0]['insights']['data'][0]['account_currency'] ?? 'MISSING',
        'recommendation' => 'Both should return INR for Indian accounts. If one returns USD, that\'s the issue!'
    ]
], JSON_PRETTY_PRINT);
?>

