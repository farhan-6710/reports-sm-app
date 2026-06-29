<?php
/**
 * Comprehensive Instagram Insights Debugger
 * Tests all accounts, identifies issues, and provides fixes
 */

header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json");

$accessToken = 'EAATy7qAW3EoBQLpL5ETzSOkPtIZBidP9axvp9fAXJzolJciSnxVSWr5P6h4g6ZACa3d3bO62UCoChATXnYLdnUV3QxZAl3xOMlqYUh39qefuI0Lkh7YzjJ03FRKZAFjNHVrYY0wy941paR8uLLZBcklFZAZAujMZBJTIUF1JFCqZAuZAAK3fKMgs7wVBpkLZCJI3L1WaKAo24LXOmKOvYZCbyRseAFos2eVZCc3kDIKAZBL8WPgXGZBL5GyORZAcLxExn3O1wxT6ZCkqX4QhR5GopdIpUP5q';
$apiVersion = 'v19.0';

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

// Test date range (last 30 days)
$endDate = date('Y-m-d');
$startDate = date('Y-m-d', strtotime('-30 days'));
$sinceUnix = strtotime($startDate);
$untilUnix = strtotime($endDate . ' 23:59:59');

$results = [];
$issues = [];
$fixes = [];

function makeApiCall($url, $params = []) {
    $params['access_token'] = $GLOBALS['accessToken'];
    $fullUrl = $url . '?' . http_build_query($params);
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $fullUrl);
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
        'http_code' => $httpCode,
        'curl_error' => $curlError,
        'data' => $data,
        'raw_response' => $response
    ];
}

// Test first 3 accounts in detail
$testAccounts = array_slice($accounts, 0, 3);

foreach ($testAccounts as $account) {
    $accountId = $account['id'];
    $accountName = $account['name'];
    
    $accountResult = [
        'account_name' => $accountName,
        'account_id' => $accountId,
        'tests' => [],
        'issues' => [],
        'fixes' => []
    ];
    
    // Test 1: Account Info
    $url = "https://graph.facebook.com/{$apiVersion}/{$accountId}";
    $result = makeApiCall($url, [
        'fields' => 'username,name,account_type,followers_count,media_count,profile_picture_url'
    ]);
    
    $accountResult['tests']['account_info'] = $result;
    
    if ($result['http_code'] === 200 && !isset($result['data']['error'])) {
        $accountType = $result['data']['account_type'] ?? 'UNKNOWN';
        $accountResult['account_type'] = $accountType;
    } else {
        $accountResult['issues'][] = "Account info failed: " . ($result['data']['error']['message'] ?? 'Unknown error');
    }
    
    // Test 2: Account Insights - Try different metric combinations
    $insightTests = [
        'test1_basic' => ['reach', 'profile_views'],
        'test2_engagement' => ['accounts_engaged', 'total_interactions'],
        'test3_all_valid' => ['reach', 'profile_views', 'website_clicks', 'accounts_engaged', 'total_interactions', 'follower_count']
    ];
    
    foreach ($insightTests as $testName => $metrics) {
        $url = "https://graph.facebook.com/{$apiVersion}/{$accountId}/insights";
        $result = makeApiCall($url, [
            'metric' => implode(',', $metrics),
            'period' => 'day',
            'since' => $sinceUnix,
            'until' => $untilUnix
        ]);
        
        $accountResult['tests'][$testName] = $result;
        
        if ($result['http_code'] === 200 && !isset($result['data']['error'])) {
            if (isset($result['data']['data']) && count($result['data']['data']) > 0) {
                // Check if we have actual values
                $hasData = false;
                foreach ($result['data']['data'] as $metricData) {
                    if (isset($metricData['values']) && count($metricData['values']) > 0) {
                        foreach ($metricData['values'] as $value) {
                            if (($value['value'] ?? 0) > 0) {
                                $hasData = true;
                                break 2;
                            }
                        }
                    }
                }
                
                if (!$hasData) {
                    $accountResult['issues'][] = "$testName: Metrics returned but all values are 0";
                    $accountResult['fixes'][] = "Check date range - data may not exist for this period. Try expanding date range or using 'lifetime' period for follower_count";
                }
            } else {
                $accountResult['issues'][] = "$testName: No data array in response";
            }
        } else {
            $errorMsg = $result['data']['error']['message'] ?? 'Unknown error';
            $accountResult['issues'][] = "$testName failed: $errorMsg";
            
            // Auto-fix suggestions
            if (strpos($errorMsg, 'metric') !== false && strpos($errorMsg, 'must be one of') !== false) {
                $accountResult['fixes'][] = "Invalid metric used. Use only: reach, profile_views, website_clicks, accounts_engaged, total_interactions, follower_count";
            }
            if (strpos($errorMsg, 'period') !== false) {
                $accountResult['fixes'][] = "Invalid period. Use 'day' for time-series data or 'lifetime' for follower_count";
            }
        }
    }
    
    // Test 3: Media (Posts)
    $url = "https://graph.facebook.com/{$apiVersion}/{$accountId}/media";
    $result = makeApiCall($url, [
        'fields' => 'id,caption,media_type,media_url,permalink,timestamp,like_count,comments_count',
        'limit' => 10
    ]);
    
    $accountResult['tests']['media'] = $result;
    
    if ($result['http_code'] === 200 && !isset($result['data']['error'])) {
        $posts = $result['data']['data'] ?? [];
        $accountResult['posts_count'] = count($posts);
        
        if (count($posts) > 0) {
            // Test media insights for first post
            $firstPostId = $posts[0]['id'];
            
            $url = "https://graph.facebook.com/{$apiVersion}/{$firstPostId}/insights";
            $mediaInsights = makeApiCall($url, [
                'metric' => 'impressions,reach,engagement,saved',
                'period' => 'lifetime'
            ]);
            
            $accountResult['tests']['media_insights'] = $mediaInsights;
            
            if ($mediaInsights['http_code'] === 200 && !isset($mediaInsights['data']['error'])) {
                $hasMediaData = false;
                if (isset($mediaInsights['data']['data'])) {
                    foreach ($mediaInsights['data']['data'] as $metric) {
                        $value = $metric['values'][0]['value'] ?? 0;
                        if ($value > 0) {
                            $hasMediaData = true;
                            break;
                        }
                    }
                }
                
                if (!$hasMediaData) {
                    $accountResult['issues'][] = "Media insights returned but all values are 0";
                    $accountResult['fixes'][] = "Post may be too new or token lacks instagram_manage_insights permission";
                }
            } else {
                $errorMsg = $mediaInsights['data']['error']['message'] ?? 'Unknown error';
                $accountResult['issues'][] = "Media insights failed: $errorMsg";
            }
        } else {
            $accountResult['issues'][] = "No posts found for this account";
        }
    } else {
        $errorMsg = $result['data']['error']['message'] ?? 'Unknown error';
        $accountResult['issues'][] = "Media fetch failed: $errorMsg";
    }
    
    // Test 4: Try lifetime period for follower_count
    $url = "https://graph.facebook.com/{$apiVersion}/{$accountId}/insights";
    $result = makeApiCall($url, [
        'metric' => 'follower_count',
        'period' => 'lifetime'
    ]);
    
    $accountResult['tests']['follower_count_lifetime'] = $result;
    
    $results[] = $accountResult;
}

// Summary
$summary = [
    'total_tested' => count($testAccounts),
    'accounts_with_data' => 0,
    'accounts_with_issues' => 0,
    'common_issues' => [],
    'recommended_fixes' => []
];

foreach ($results as $result) {
    if (count($result['issues']) > 0) {
        $summary['accounts_with_issues']++;
        foreach ($result['issues'] as $issue) {
            $summary['common_issues'][] = $issue;
        }
    } else {
        $summary['accounts_with_data']++;
    }
    
    foreach ($result['fixes'] as $fix) {
        $summary['recommended_fixes'][] = $fix;
    }
}

$summary['common_issues'] = array_unique($summary['common_issues']);
$summary['recommended_fixes'] = array_unique($summary['recommended_fixes']);

echo json_encode([
    'success' => true,
    'date_range' => ['start' => $startDate, 'end' => $endDate, 'since' => $sinceUnix, 'until' => $untilUnix],
    'summary' => $summary,
    'detailed_results' => $results
], JSON_PRETTY_PRINT);
?>
