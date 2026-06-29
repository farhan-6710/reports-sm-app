<?php
/**
 * Instagram Insights Diagnostic Tool
 * Use this to test if your token has the right permissions
 * and to see exactly what data the API returns
 */

// Enable error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);

header('Content-Type: application/json');

// Get parameters
$accountId = $_GET['account_id'] ?? '';
$accessToken = $_GET['access_token'] ?? '';

if (empty($accountId) || empty($accessToken)) {
    echo json_encode([
        'error' => 'Missing parameters',
        'usage' => 'test_instagram_insights.php?account_id=YOUR_IG_ID&access_token=YOUR_TOKEN',
        'example' => 'test_instagram_insights.php?account_id=17841476214409160&access_token=EAAxxxx'
    ]);
    exit;
}

$results = [];

// Test 1: Basic account info
$results['test1_account_info'] = testAccountInfo($accountId, $accessToken);

// Test 2: Account-level insights
$results['test2_account_insights'] = testAccountInsights($accountId, $accessToken);

// Test 3: Media insights
$results['test3_media_insights'] = testMediaInsights($accountId, $accessToken);

// Test 4: Token permissions
$results['test4_token_permissions'] = testTokenPermissions($accessToken);

echo json_encode($results, JSON_PRETTY_PRINT);

// ====================
// Test Functions
// ====================

function testAccountInfo($accountId, $accessToken) {
    $url = "https://graph.facebook.com/v18.0/{$accountId}";
    $params = [
        'fields' => 'username,name,followers_count,media_count',
        'access_token' => $accessToken
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    return [
        'http_code' => $httpCode,
        'status' => $httpCode === 200 ? '✅ SUCCESS' : '❌ FAILED',
        'response' => json_decode($response, true),
        'raw_response' => $response
    ];
}

function testAccountInsights($accountId, $accessToken) {
    $url = "https://graph.facebook.com/v18.0/{$accountId}/insights";
    
    $endDate = date('Y-m-d');
    $startDate = date('Y-m-d', strtotime('-30 days'));
    
    $params = [
        'metric' => 'impressions,reach,profile_views',
        'period' => 'day',
        'since' => strtotime($startDate),
        'until' => strtotime($endDate),
        'access_token' => $accessToken
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    $decoded = json_decode($response, true);
    
    return [
        'http_code' => $httpCode,
        'status' => $httpCode === 200 ? '✅ SUCCESS' : '❌ FAILED',
        'date_range' => "$startDate to $endDate",
        'response' => $decoded,
        'raw_response' => $response,
        'diagnosis' => diagnoseInsightsError($httpCode, $decoded)
    ];
}

function testMediaInsights($accountId, $accessToken) {
    // First get recent media
    $url = "https://graph.facebook.com/v18.0/{$accountId}/media";
    $params = [
        'fields' => 'id,caption,timestamp',
        'limit' => 5,
        'access_token' => $accessToken
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    $media = json_decode($response, true)['data'] ?? [];
    
    if (empty($media)) {
        return [
            'status' => '⚠️  NO MEDIA FOUND',
            'message' => 'No posts found to test insights'
        ];
    }
    
    // Test insights for first post
    $firstPost = $media[0];
    $mediaId = $firstPost['id'];
    
    $url = "https://graph.facebook.com/v18.0/{$mediaId}/insights";
    $params = [
        'metric' => 'impressions,reach,engagement',
        'access_token' => $accessToken
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    $decoded = json_decode($response, true);
    
    return [
        'http_code' => $httpCode,
        'status' => $httpCode === 200 ? '✅ SUCCESS' : '❌ FAILED',
        'tested_post' => $firstPost,
        'response' => $decoded,
        'raw_response' => $response,
        'diagnosis' => diagnoseInsightsError($httpCode, $decoded)
    ];
}

function testTokenPermissions($accessToken) {
    $url = "https://graph.facebook.com/v18.0/me/permissions";
    $params = ['access_token' => $accessToken];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    $data = json_decode($response, true);
    $permissions = $data['data'] ?? [];
    
    // Check for required permissions
    $requiredPermissions = [
        'instagram_basic',
        'instagram_manage_insights',
        'pages_show_list',
        'pages_read_engagement',
        'read_insights'
    ];
    
    $grantedPermissions = [];
    $missingPermissions = [];
    
    foreach ($permissions as $perm) {
        if ($perm['status'] === 'granted') {
            $grantedPermissions[] = $perm['permission'];
        }
    }
    
    foreach ($requiredPermissions as $req) {
        if (!in_array($req, $grantedPermissions)) {
            $missingPermissions[] = $req;
        }
    }
    
    return [
        'http_code' => $httpCode,
        'status' => empty($missingPermissions) ? '✅ ALL PERMISSIONS GRANTED' : '⚠️  MISSING PERMISSIONS',
        'granted_permissions' => $grantedPermissions,
        'missing_permissions' => $missingPermissions,
        'all_permissions' => $permissions
    ];
}

function diagnoseInsightsError($httpCode, $response) {
    if ($httpCode === 200) {
        return '✅ API call successful';
    }
    
    $errorMessage = $response['error']['message'] ?? 'Unknown error';
    $errorCode = $response['error']['code'] ?? 'Unknown';
    
    $diagnosis = "❌ Error $errorCode: $errorMessage\n\n";
    
    // Common error diagnoses
    if (strpos($errorMessage, 'permissions') !== false || strpos($errorMessage, 'permission') !== false) {
        $diagnosis .= "🔑 PERMISSION ISSUE:\n";
        $diagnosis .= "- Your token is missing 'instagram_manage_insights' permission\n";
        $diagnosis .= "- Go to Graph API Explorer\n";
        $diagnosis .= "- Generate new token with 'instagram_manage_insights' checked\n";
        $diagnosis .= "- Update the token in your dashboard\n";
    } elseif (strpos($errorMessage, 'does not exist') !== false) {
        $diagnosis .= "🔍 ACCOUNT ISSUE:\n";
        $diagnosis .= "- The Instagram account ID might be incorrect\n";
        $diagnosis .= "- Make sure it's an Instagram Business Account ID (starts with 17)\n";
        $diagnosis .= "- Verify the account is linked to a Facebook Page\n";
    } elseif (strpos($errorMessage, 'access token') !== false) {
        $diagnosis .= "🔑 TOKEN ISSUE:\n";
        $diagnosis .= "- Your access token might be expired or invalid\n";
        $diagnosis .= "- Generate a new token in Graph API Explorer\n";
        $diagnosis .= "- Make sure to use the PAGE token, not the user token\n";
    } else {
        $diagnosis .= "📋 GENERAL TROUBLESHOOTING:\n";
        $diagnosis .= "1. Verify account is Instagram Business (not Personal)\n";
        $diagnosis .= "2. Check account is linked to Facebook Page\n";
        $diagnosis .= "3. Regenerate token with all Instagram permissions\n";
        $diagnosis .= "4. Make sure you're using Page token (from me/accounts)\n";
    }
    
    return $diagnosis;
}
?>

