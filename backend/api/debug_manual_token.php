<?php

require_once __DIR__ . '/../config/database.php';

header('Content-Type: text/plain');

$manual_token = 'EAATy7qAW3EoBQRZA1BNx7qMYu6JiJoXWGbeV2gMvWcCIBuN0O97eTZBUZAfCoQgZBcnfA6i79noosG3ZA64MtkcExZClbUDwFvg4n2LZCKrVLWcAR9ZBYZBVfqUSfhAeJBNmmHf1ZCibYayM2Nuff5WksIb7EGlhUivx7zYtM0zajhWfOvCSzfGQKb6wZBx8pAZCM0npURxWLQqBRfxNxDRtK9s4hX4RGIdZCpHQoDUOaJgXFaRYcYeD1lwg4QFMsRNI6JinTkeDshoCMIRZBUQ6RZBm72d9wZDZD';
$ad_account_id = 'act_1431693314617982'; // Armario Pro

echo "Debugging Manual Token...\n";
echo "Token: " . substr($manual_token, 0, 10) . "...\n";
echo "Target Ad Account: $ad_account_id\n\n";

// 0. Identify User
echo "0. Identifying User...\n";
$me_url = "https://graph.facebook.com/v19.0/me?fields=id,name&access_token={$manual_token}";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $me_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$me_response = curl_exec($ch);
curl_close($ch);
$me_data = json_decode($me_response, true);
if (isset($me_data['name'])) {
    echo "ads_read User: " . $me_data['name'] . " (ID: " . $me_data['id'] . ")\n";
} else {
    echo "Could not identify user.\n";
}

// 1. Debug Token to check permissions/scopes
$debug_url = "https://graph.facebook.com/v19.0/debug_token?input_token={$manual_token}&access_token={$manual_token}";

echo "1. Checking Token Scopes (debug_token)...\n";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $debug_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_error = curl_error($ch);
curl_close($ch);

echo "HTTP Code: $http_code\n";
if ($curl_error)
    echo "CURL Error: $curl_error\n";

$debug_data = json_decode($response, true);

if (isset($debug_data['data'])) {
    echo "✅ Token is VALID.\n";
    echo "User ID: " . $debug_data['data']['user_id'] . "\n";
    echo "Scopes: " . implode(', ', $debug_data['data']['scopes'] ?? []) . "\n";

    $scopes = $debug_data['data']['scopes'] ?? [];
    if (in_array('ads_read', $scopes)) {
        echo "✅ 'ads_read' permission present.\n";
    } else {
        echo "❌ 'ads_read' permission MISSING.\n";
    }
} else {
    echo "❌ Token Validation Failed:\n";
    print_r($debug_data);
}

echo "\n---------------------------------------------------\n";

// 2. Fetch Accessible Ad Accounts
echo "2. Fetching Accessible Ad Accounts (me/adaccounts)...\n";
$account_url = "https://graph.facebook.com/v19.0/me/adaccounts?fields=name,account_id,account_status&limit=50&access_token={$manual_token}";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $account_url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response = curl_exec($ch);
$http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$curl_error = curl_error($ch);
curl_close($ch);

echo "HTTP Code: $http_code\n";
if ($curl_error)
    echo "CURL Error: $curl_error\n";

$accounts_data = json_decode($response, true);
if (isset($accounts_data['data'])) {
    echo "✅ Found " . count($accounts_data['data']) . " ad accounts:\n";
    $applies_to_target = false;
    foreach ($accounts_data['data'] as $acc) {
        echo " - " . $acc['name'] . " (ID: " . $acc['account_id'] . ")\n";
        if ($acc['account_id'] == '1431693314617982') {
            $applies_to_target = true;
        }
    }

    if ($applies_to_target) {
        echo "\n✅ Target Account Found in List! Safe to update.\n";
    } else {
        echo "\n⚠️ Target Account NOT found in list. Token might belong to a different user.\n";
    }
} else {
    echo "❌ Failed to list ad accounts:\n";
    print_r($accounts_data);
}
?>