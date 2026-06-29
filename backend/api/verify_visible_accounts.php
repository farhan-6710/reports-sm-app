<?php
// backend/api/verify_visible_accounts.php
header('Content-Type: text/plain');

// 1. The Manual Token (from your debug file)
$manual_token = 'EAAQOZAaHvqLUBQewWslqgWTuRBmX2zVtI26zmZAnvgbJfqTKwZBgEZA8JAEC0CgBZBjxH4Y0E2QZBia4hr7ZCMToHFZAw8g1A67oaDLfhUr99RZC68ZB86XdOq7hqtWtmiAPrXa9lIjpSQHddVTYNeV9wPH3YOjpolkKtRHbkZCPZBZB0b0J5iJwjcjUKBQOH3iQBYeZCtypl5FZCI5RUYUsUZBXQxAKpAvfBYBSvvMRzLsI0aVT70KHKF9Dhfv5YUZClQ4iKvGkXgjNVkMZCZCOmcyRk8sA2CPSFd3303iRsCxEyKFCAZDZD';

echo "🔍 CHECKING VISIBLE ACCOUNTS WITH YOUR TOKEN...\n";
echo "---------------------------------------------------\n";

// 2. Fetch Ad Accounts
$url = "https://graph.facebook.com/v19.0/me/adaccounts?fields=name,account_id,account_status&limit=100&access_token={$manual_token}";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response = curl_exec($ch);
curl_close($ch);

$data = json_decode($response, true);

if (isset($data['data'])) {
    $count = count($data['data']);
    echo "✅ AD ACCOUNTS FOUND: $count\n\n";
    foreach ($data['data'] as $acc) {
        echo "[AD ACCOUNT] ID: {$acc['account_id']} | Name: {$acc['name']}\n";
    }
} else {
    echo "❌ NO AD ACCOUNTS FOUND OR ERROR:\n";
    print_r($data);
}

echo "\n---------------------------------------------------\n";

// 3. Fetch Pages (for Organic/Instagram)
$url_pages = "https://graph.facebook.com/v19.0/me/accounts?fields=name,id,instagram_business_account&limit=100&access_token={$manual_token}";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url_pages);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response_pages = curl_exec($ch);
curl_close($ch);

$data_pages = json_decode($response_pages, true);

if (isset($data_pages['data'])) {
    $count_p = count($data_pages['data']);
    echo "✅ PAGES / INSTAGRAM FOUND: $count_p\n\n";
    foreach ($data_pages['data'] as $page) {
        $ig_info = isset($page['instagram_business_account']) ? " | IG ID: " . $page['instagram_business_account']['id'] : " | No IG Linked";
        echo "[PAGE] ID: {$page['id']} | Name: {$page['name']}$ig_info\n";
    }
} else {
    echo "❌ NO PAGES FOUND OR ERROR:\n";
    print_r($data_pages);
}
?>