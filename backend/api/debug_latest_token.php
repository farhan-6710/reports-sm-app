<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../services/FacebookAdsService.php';

// The LATEST token provided (starts with EAATy7qAW3EoBQRkn...)
$accessToken = 'EAATy7qAW3EoBQRknZBuIoEyQTqfaKZBUyRG8LFfz5J66Kk77vNUFp72XH9ZA5T5FfqmJ4nnXqOGZBMBT4ZBQI7CZCHIpowJZAY2vfCFDe8tVDG21fXrSsxUmKWOpDPC1ylSn9bSZBwt3U0sns1sgRTZAKKlXdARKF1FDrwnubNQCV3blz0bdZAbyDSJ3UNLKtRAeGRZBXZBy8xYcszcb6FckiAQkwkaf5VXfO7ioAsfRd2kP9Tu1bMfiZAPzpb1n0rX8DhLpAboJDpUT9u2qavsrfYVJQ';

// Target IDs we are looking for
$targets = [
    'OTC' => '1945723119170714',
    'Sorshe' => '767631601408575'
];

// 1. List Ad Accounts
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://graph.facebook.com/v18.0/me/adaccounts?fields=name,account_id&limit=100&access_token=$accessToken");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response = curl_exec($ch);
$data = json_decode($response, true);
curl_close($ch);

$accounts = [];
$foundTargets = [];

if (isset($data['data'])) {
    foreach ($data['data'] as $acc) {
        $accounts[] = "[{$acc['account_id']}] {$acc['name']}";
        foreach ($targets as $name => $id) {
            if ($acc['account_id'] == $id) {
                $foundTargets[$name] = true;
            }
        }
    }
}

$output = [
    'accessible_count' => count($accounts),
    'accessible_accounts' => $accounts,
    'search_results' => []
];

foreach ($targets as $name => $id) {
    if (isset($foundTargets[$name])) {
        $output['search_results'][$name] = "✅ FOUND";
    } else {
        $output['search_results'][$name] = "❌ MISSING";
    }
}

file_put_contents(__DIR__ . '/latest_token_results.json', json_encode($output, JSON_PRETTY_PRINT));
echo "Done. Written to latest_token_results.json\n";
?>