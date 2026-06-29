<?php
// backend/api/verify_two_tokens.php

// 1. THE TOKENS
$tokens = [
    'Token_1_EAAQ' => 'EAAQOZAaHvqLUBQewWslqgWTuRBmX2zVtI26zmZAnvgbJfqTKwZBgEZA8JAEC0CgBZBjxH4Y0E2QZBia4hr7ZCMToHFZAw8g1A67oaDLfhUr99RZC68ZB86XdOq7hqtWtmiAPrXa9lIjpSQHddVTYNeV9wPH3YOjpolkKtRHbkZCPZBZB0b0J5iJwjcjUKBQOH3iQBYeZCtypl5FZCI5RUYUsUZBXQxAKpAvfBYBSvvMRzLsI0aVT70KHKF9Dhfv5YUZClQ4iKvGkXgjNVkMZCZCOmcyRk8sA2CPSFd3303iRsCxEyKFCAZDZD',
    'Token_2_EAAT' => 'EAATy7qAW3EoBQSrf6ZBUWvOLzX4ey9mzB0pYeD6qAwyN3rZAhAyZBTi6xO4ZB9ELN9xnsgPKZAPtu55VbsyQORTmAmWwvrsFh6OcEYiRKludSDIS8Lmf7nMVqVjsbAmyfpdHAsbijuDcQ7Ca5FB9SpTOBAGpeR73bFFR2oVWHkX0jww5ZA9V6lfSu7LhumR0PoCJ5XdbgGklAGGFNCGGPOnbD4AWJZC8lf9'
];

// 2. THE WATCHLIST (IDs from your spreadsheet/debug file)
// I've extracted these from the debug_new_credentials.php file which matches your sheet structure
$watchlist = [
    'Sorshe' => ['ad' => '767631601408575'],
    'OTC' => ['ad' => '1945723119170714'],
    'Veda Hospitals' => ['ad' => '1448640106038864'],
    'Bikanervala' => ['ad' => '9586283778155853'],
    'Tales Of Telugu' => ['ad' => '1952983582156419'],
    'Armario Pro' => ['ad' => '1389344766087270'],
    // Add others if needed
];

header('Content-Type: text/plain');
echo "🔍 VERIFYING ACCESS FOR 2 TOKENS\n";
echo "-------------------------------\n";

// Map to store what we find
$accessible_accounts = [];

// Helper to fetch
function fetchAccounts($token, $label)
{
    $found = [];

    // 1. Get Owner
    $ch = curl_init("https://graph.facebook.com/v19.0/me?fields=name&access_token=$token");
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $owner = json_decode(curl_exec($ch), true);
    curl_close($ch);

    $ownerName = $owner['name'] ?? 'Unknown';
    echo "🔑 $label (Owner: $ownerName)\n";

    // 2. Get Ad Accounts
    $url = "https://graph.facebook.com/v19.0/me/adaccounts?fields=name,account_id&limit=100&access_token=$token";
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $res = json_decode(curl_exec($ch), true);
    curl_close($ch);

    if (isset($res['data'])) {
        foreach ($res['data'] as $acc) {
            $id = str_replace('act_', '', $acc['account_id']);
            $found["AD:" . $id] = "[Ad] " . $acc['name']; // Prefix to distinguish
        }
        echo "   ✅ Found " . count($res['data']) . " Ad Accounts.\n";
    } else {
        echo "   ❌ Error Fetching Ads: " . ($res['error']['message'] ?? 'Unknown') . "\n";
    }

    // 3. Get Pages
    $url = "https://graph.facebook.com/v19.0/me/accounts?fields=name,id&limit=100&access_token=$token";
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $res = json_decode(curl_exec($ch), true);
    curl_close($ch);

    if (isset($res['data'])) {
        foreach ($res['data'] as $page) {
            $found["PG:" . $page['id']] = "[Page] " . $page['name'];
        }
        echo "   ✅ Found " . count($res['data']) . " Pages.\n";
    }

    return $found;
}

// CAPTURE OUTPUT BUFFER
ob_start();

// EXECUTE CHECKS
$all_access_map = []; // ID => [TokenLabel, Name]

foreach ($tokens as $label => $token) {
    echo "Processing $label...\n";
    $found = fetchAccounts($token, $label);
    foreach ($found as $id => $name) {
        $all_access_map[$id] = ['token' => $label, 'name' => $name];
    }
    echo "\n";
}

// REPORT ON WATCHLIST
echo "📊 WATCHLIST REPORT\n";
echo "--------------------\n";

foreach ($watchlist as $clientName => $ids) {
    // Check Ad
    $adId = "AD:" . $ids['ad'];
    if (isset($all_access_map[$adId])) {
        $info = $all_access_map[$adId];
        echo "✅ [AD ACCESSIBLE] $clientName (ID: {$ids['ad']})\n";
        echo "   -> Via: {$info['token']}\n";
    } else {
        // Just report not found for ad, user might have page access
        echo "❌ [AD MISSING] $clientName (ID: {$ids['ad']})\n";
    }
    echo "--------------------\n";
}

// LIST ALL OTHERS (sorted by Name)
uasort($all_access_map, function ($a, $b) {
    return strcmp($a['name'], $b['name']); });

echo "\n🌍 ALL VERIFIED ACCESSIBLE ACCOUNTS (Ads & Pages):\n";
foreach ($all_access_map as $id => $info) {
    echo "   - [{$info['token']}] {$info['name']} (ID: " . str_replace(['AD:', 'PG:'], '', $id) . ")\n";
}

$output = ob_get_clean();
file_put_contents(__DIR__ . '/verification_results.txt', $output);
echo $output;
?>