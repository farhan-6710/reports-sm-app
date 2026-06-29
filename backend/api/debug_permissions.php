<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../services/FacebookAdsService.php';

$accessToken = 'EAATy7qAW3EoBQcfDSsZCBlZAfwnNZBpst5LZAlNjlx4iZB7nMzYhBvqNfJ93C2XAIjSKGeMnhTWXibR2k4mrEEAo4nAfEqdBxuefVNREEmdZB1QU8ZAPQmKVKQNcU14ljIoKq71hVeBcbPFBJQCoNIbymvYGPN66G7TI5NM9xogvCTTqTZCILpOahdbFaM4ZAexPup8Hbn1GN1ZA0RUUZCVFoYBRCwZBF0Y1blRv1upErqeHPAlSAYsqo6MjsHTOTcmxbREPA8npBV7Cv5KDJHXDS1BG';
$problematicAdAccountId = '9586283778155853';

$results = [
    'permissions' => [],
    'problematic_account' => [],
    'accessible_accounts' => [],
    'is_problem_account_accessible' => false
];

$service = new FacebookAdsService($accessToken);

// 1. Check Permissions
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://graph.facebook.com/v18.0/me/permissions?access_token=$accessToken");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response = curl_exec($ch);
$perms = json_decode($response, true);
curl_close($ch);

if (isset($perms['data'])) {
    foreach ($perms['data'] as $p) {
        if ($p['status'] === 'granted') {
            $results['permissions'][] = $p['permission'];
        }
    }
}

// 2. Check Problematic Account directly
try {
    $info = $service->getAdAccountInfo($problematicAdAccountId);
    $results['problematic_account'] = $info;
} catch (Exception $e) {
    $results['problematic_account'] = ['error' => $e->getMessage()];
}

// 3. List Accessible Ad Accounts
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://graph.facebook.com/v18.0/me/adaccounts?fields=name,account_id,account_status&limit=50&access_token=$accessToken");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response = curl_exec($ch);
$accounts = json_decode($response, true);
curl_close($ch);

if (isset($accounts['data'])) {
    foreach ($accounts['data'] as $acc) {
        $results['accessible_accounts'][] = [
            'id' => $acc['account_id'],
            'name' => $acc['name']
        ];
        if ($acc['account_id'] == $problematicAdAccountId) {
            $results['is_problem_account_accessible'] = true;
        }
    }
}

file_put_contents(__DIR__ . '/permission_results.json', json_encode($results, JSON_PRETTY_PRINT));
echo "Done. Wrote results to permission_results.json\n";
?>