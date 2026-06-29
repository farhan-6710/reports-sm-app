<?php
/**
 * Live Instagram Insights Debug Tool
 * Tests real API calls with provided token and IDs
 * Identifies root causes and provides fixes
 */

error_reporting(E_ALL);
ini_set('display_errors', 1);
header('Content-Type: application/json');

// Access token provided by user
$accessToken = 'EAATy7qAW3EoBQLpL5ETzSOkPtIZBidP9axvp9fAXJzolJciSnxVSWr5P6h4g6ZACa3d3bO62UCoChATXnYLdnUV3QxZAl3xOMlqYUh39qefuI0Lkh7YzjJ03FRKZAFjNHVrYY0wy941paR8uLLZBcklFZAZAujMZBJTIUF1JFCqRZAuZAAK3fKMgs7wVBpkLZCJI3L1WaKAo24LXOmKOvYZCbyRseAFos2eVZCc3kDIKAZBL8WPgXGZBL5GyORZAcLxExn3O1wxT6ZCkqX4QhR5GopdIpUP5q';

// Instagram Business Account IDs to test
$instagramIds = [
    'malnadukitchen' => '17841408769245289',
    'alaterracelounge' => '17841417697310086',
    'kulture_sportsbar' => '17841417527669773',
    'otc.kompally' => '17841453683516805',
    'raas_academy_' => '17841474063739857',
    'i.am.beinngself' => '17841470724710223',
    'aromasandco_' => '17841477274203754',
    'villionairesofficial' => '17841465257655312',
    'blossifiore' => '17841477658018366',
    'elhamtheschool' => '17841472119348822',
    'kunda_chai_com' => '17841466930025682',
    'armario.pro' => '17841476214409160',
    'instashoot_by_dc' => '17841476673700469',
    '90sauthentickitchen' => '17841473888497604',
    'digicarotene_academy' => '17841476143845943',
    'knotara_macrame' => '17841467648484325',
    'tecorarestaurant' => '17841472835004206'
];

// Test at least 3 IDs as required
$testIds = array_slice($instagramIds, 0, 3, true);

$results = [];
$apiVersion = 'v19.0'; // Using v19.0 as per codebase

foreach ($testIds as $username => $igId) {
    $results[$username] = [
        'instagram_id' => $igId,
        'tests' => []
    ];
    
    // Test 1: Account Info
    $results[$username]['tests']['account_info'] = testAccountInfo($igId, $accessToken, $apiVersion);
    
    // Test 2: Account-level Insights (with different date ranges)
    $results[$username]['tests']['account_insights'] = testAccountInsights($igId, $accessToken, $apiVersion);
    
    // Test 3: Get Media
    $results[$username]['tests']['media_list'] = testMediaList($igId, $accessToken, $apiVersion);
    
    // Test 4: Media Insights (if media exists)
    if (!empty($results[$username]['tests']['media_list']['media_ids'])) {
        $firstMediaId = $results[$username]['tests']['media_list']['media_ids'][0];
        $results[$username]['tests']['media_insights'] = testMediaInsights($firstMediaId, $accessToken, $apiVersion);
    }
    
    // Test 5: Token Permissions
    if ($username === array_key_first($testIds)) {
        $results['token_permissions'] = testTokenPermissions($accessToken, $apiVersion);
    }
}

// Summary
$results['summary'] = generateSummary($results);

echo json_encode($results, JSON_PRETTY_PRINT);

// ====================
// Test Functions
// ====================

function makeApiRequest($url, $params) {
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
        'response' => $data,
        'raw_response' => $response
    ];
}

function testAccountInfo($igId, $token, $apiVersion) {
    $url = "https://graph.facebook.com/{$apiVersion}/{$igId}";
    $params = [
        'fields' => 'username,name,account_type,followers_count,media_count,profile_picture_url',
        'access_token' => $token
    ];
    
    $result = makeApiRequest($url, $params);
    
    return [
        'status' => $result['http_code'] === 200 ? 'SUCCESS' : 'FAILED',
        'http_code' => $result['http_code'],
        'data' => $result['response'],
        'error' => $result['response']['error'] ?? null,
        'diagnosis' => diagnoseAccountInfo($result)
    ];
}

function testAccountInsights($igId, $token, $apiVersion) {
    $url = "https://graph.facebook.com/{$apiVersion}/{$igId}/insights";
    
    // Test multiple date ranges and metric combinations
    $tests = [];
    
    // Test 1: Last 7 days with common metrics
    $endDate = time();
    $startDate = strtotime('-7 days');
    
    $metrics = [
        ['reach', 'profile_views', 'website_clicks'],
        ['impressions', 'reach', 'profile_views'],
        ['reach', 'profile_views', 'accounts_engaged', 'total_interactions'],
        ['follower_count']
    ];
    
    foreach ($metrics as $idx => $metricList) {
        $params = [
            'metric' => implode(',', $metricList),
            'period' => 'day',
            'since' => $startDate,
            'until' => $endDate,
            'access_token' => $token
        ];
        
        $result = makeApiRequest($url, $params);
        
        $tests["test_" . ($idx + 1) . "_" . implode('_', $metricList)] = [
            'status' => $result['http_code'] === 200 ? 'SUCCESS' : 'FAILED',
            'http_code' => $result['http_code'],
            'metrics_requested' => $metricList,
            'date_range' => date('Y-m-d', $startDate) . ' to ' . date('Y-m-d', $endDate),
            'data' => $result['response'],
            'error' => $result['response']['error'] ?? null,
            'diagnosis' => diagnoseInsightsError($result, $metricList)
        ];
        
        // Small delay to avoid rate limiting
        usleep(200000); // 0.2 seconds
    }
    
    // Test 2: Last 30 days
    $startDate30 = strtotime('-30 days');
    $params30 = [
        'metric' => 'reach,profile_views',
        'period' => 'day',
        'since' => $startDate30,
        'until' => $endDate,
        'access_token' => $token
    ];
    
    $result30 = makeApiRequest($url, $params30);
    $tests['test_30_days'] = [
        'status' => $result30['http_code'] === 200 ? 'SUCCESS' : 'FAILED',
        'http_code' => $result30['http_code'],
        'date_range' => date('Y-m-d', $startDate30) . ' to ' . date('Y-m-d', $endDate),
        'data' => $result30['response'],
        'error' => $result30['response']['error'] ?? null
    ];
    
    return $tests;
}

function testMediaList($igId, $token, $apiVersion) {
    $url = "https://graph.facebook.com/{$apiVersion}/{$igId}/media";
    $params = [
        'fields' => 'id,caption,media_type,media_product_type,timestamp,like_count,comments_count',
        'limit' => 10,
        'access_token' => $token
    ];
    
    $result = makeApiRequest($url, $params);
    
    $mediaIds = [];
    if ($result['http_code'] === 200 && isset($result['response']['data'])) {
        $mediaIds = array_column($result['response']['data'], 'id');
    }
    
    return [
        'status' => $result['http_code'] === 200 ? 'SUCCESS' : 'FAILED',
        'http_code' => $result['http_code'],
        'media_count' => count($mediaIds),
        'media_ids' => $mediaIds,
        'data' => $result['response'],
        'error' => $result['response']['error'] ?? null
    ];
}

function testMediaInsights($mediaId, $token, $apiVersion) {
    $url = "https://graph.facebook.com/{$apiVersion}/{$mediaId}/insights";
    
    // Test different metric combinations
    $tests = [];
    
    $metricCombos = [
        ['impressions', 'reach', 'engagement'],
        ['views', 'reach', 'saved', 'shares'],
        ['plays', 'reach', 'saved'],
        ['impressions', 'reach']
    ];
    
    foreach ($metricCombos as $idx => $metrics) {
        $params = [
            'metric' => implode(',', $metrics),
            'period' => 'lifetime',
            'access_token' => $token
        ];
        
        $result = makeApiRequest($url, $params);
        
        $tests["combo_" . ($idx + 1)] = [
            'status' => $result['http_code'] === 200 ? 'SUCCESS' : 'FAILED',
            'http_code' => $result['http_code'],
            'metrics_requested' => $metrics,
            'data' => $result['response'],
            'error' => $result['response']['error'] ?? null,
            'values_extracted' => extractMetricValues($result['response'])
        ];
        
        usleep(200000);
    }
    
    return $tests;
}

function testTokenPermissions($token, $apiVersion) {
    $url = "https://graph.facebook.com/{$apiVersion}/me/permissions";
    $params = ['access_token' => $token];
    
    $result = makeApiRequest($url, $params);
    
    $permissions = [];
    $granted = [];
    
    if ($result['http_code'] === 200 && isset($result['response']['data'])) {
        foreach ($result['response']['data'] as $perm) {
            $permissions[] = $perm;
            if (($perm['status'] ?? '') === 'granted') {
                $granted[] = $perm['permission'];
            }
        }
    }
    
    $required = [
        'instagram_basic',
        'instagram_manage_insights',
        'pages_show_list',
        'pages_read_engagement',
        'read_insights'
    ];
    
    $missing = array_diff($required, $granted);
    
    return [
        'status' => empty($missing) ? 'ALL_GRANTED' : 'MISSING_PERMISSIONS',
        'granted' => $granted,
        'missing' => array_values($missing),
        'all_permissions' => $permissions
    ];
}

function extractMetricValues($response) {
    $values = [];
    
    if (isset($response['data']) && is_array($response['data'])) {
        foreach ($response['data'] as $metric) {
            $metricName = $metric['name'] ?? 'unknown';
            $metricValues = $metric['values'] ?? [];
            
            if (!empty($metricValues)) {
                $firstValue = $metricValues[0]['value'] ?? 0;
                $lastValue = end($metricValues)['value'] ?? 0;
                $sum = array_sum(array_column($metricValues, 'value'));
                
                $values[$metricName] = [
                    'first' => $firstValue,
                    'last' => $lastValue,
                    'sum' => $sum,
                    'count' => count($metricValues)
                ];
            } else {
                $values[$metricName] = ['error' => 'No values in response'];
            }
        }
    }
    
    return $values;
}

function diagnoseAccountInfo($result) {
    if ($result['http_code'] === 200) {
        return 'Account info retrieved successfully';
    }
    
    $error = $result['response']['error'] ?? null;
    if (!$error) {
        return 'Unknown error - HTTP ' . $result['http_code'];
    }
    
    $code = $error['code'] ?? 'Unknown';
    $message = $error['message'] ?? 'Unknown error';
    
    if ($code == 190 || strpos($message, 'token') !== false) {
        return "TOKEN ERROR: Token is invalid or expired. Code: $code";
    }
    
    if ($code == 100 || strpos($message, 'does not exist') !== false) {
        return "ACCOUNT ERROR: Instagram ID does not exist or is not accessible. Code: $code";
    }
    
    return "Error $code: $message";
}

function diagnoseInsightsError($result, $metrics) {
    if ($result['http_code'] === 200) {
        $data = $result['response']['data'] ?? [];
        if (empty($data)) {
            return 'API returned success but no data. Possible reasons: Date range has no activity, metrics not available for this account type.';
        }
        
        $hasValues = false;
        foreach ($data as $metric) {
            if (!empty($metric['values'])) {
                $hasValues = true;
                break;
            }
        }
        
        if (!$hasValues) {
            return 'API returned data structure but all values are empty. Date range may have no activity.';
        }
        
        return 'SUCCESS: Data retrieved with values';
    }
    
    $error = $result['response']['error'] ?? null;
    if (!$error) {
        return 'Unknown error - HTTP ' . $result['http_code'];
    }
    
    $code = $error['code'] ?? 'Unknown';
    $message = $error['message'] ?? 'Unknown error';
    $subcode = $error['error_subcode'] ?? null;
    
    $diagnosis = "Error $code: $message\n";
    
    // Check for invalid metrics
    if (strpos($message, 'invalid metric') !== false || strpos($message, 'not valid') !== false) {
        $diagnosis .= "\nINVALID METRICS: One or more requested metrics are not valid for this account type or API version.\n";
        $diagnosis .= "Requested: " . implode(', ', $metrics) . "\n";
        $diagnosis .= "For Instagram Business accounts in v19.0, valid account-level metrics are:\n";
        $diagnosis .= "- reach, profile_views, website_clicks, accounts_engaged, total_interactions, follower_count\n";
        $diagnosis .= "Note: 'impressions' is NOT available for account-level insights in v19.0\n";
    }
    
    // Check for permission errors
    if ($code == 10 || strpos($message, 'permission') !== false) {
        $diagnosis .= "\nPERMISSION ERROR: Token missing required permissions.\n";
        $diagnosis .= "Required: instagram_manage_insights, instagram_basic\n";
    }
    
    // Check for date range issues
    if (strpos($message, 'date') !== false || strpos($message, 'time') !== false) {
        $diagnosis .= "\nDATE RANGE ERROR: Invalid date range or dates too far in past/future.\n";
    }
    
    return $diagnosis;
}

function generateSummary($results) {
    $summary = [
        'total_accounts_tested' => count($results) - 1, // Exclude token_permissions and summary
        'accounts_with_data' => 0,
        'accounts_with_zero_data' => 0,
        'common_issues' => [],
        'recommendations' => []
    ];
    
    $issues = [];
    
    foreach ($results as $key => $account) {
        if ($key === 'token_permissions' || $key === 'summary') continue;
        
        $hasData = false;
        $hasZeroData = false;
        
        // Check account insights
        if (isset($account['tests']['account_insights'])) {
            foreach ($account['tests']['account_insights'] as $test) {
                if ($test['status'] === 'SUCCESS' && !empty($test['data']['data'])) {
                    foreach ($test['data']['data'] as $metric) {
                        $values = $metric['values'] ?? [];
                        foreach ($values as $val) {
                            if (($val['value'] ?? 0) > 0) {
                                $hasData = true;
                                break 2;
                            }
                        }
                    }
                    if (!$hasData) {
                        $hasZeroData = true;
                    }
                }
            }
        }
        
        if ($hasData) {
            $summary['accounts_with_data']++;
        } elseif ($hasZeroData) {
            $summary['accounts_with_zero_data']++;
        }
    }
    
    // Check token permissions
    if (isset($results['token_permissions'])) {
        if (!empty($results['token_permissions']['missing'])) {
            $summary['common_issues'][] = 'Missing token permissions: ' . implode(', ', $results['token_permissions']['missing']);
        }
    }
    
    // Generate recommendations
    if ($summary['accounts_with_zero_data'] > 0) {
        $summary['recommendations'][] = 'Some accounts return zero data - check date ranges and metric availability';
    }
    
    if (!empty($summary['common_issues'])) {
        $summary['recommendations'][] = 'Fix token permissions and retry';
    }
    
    return $summary;
}
?>

















