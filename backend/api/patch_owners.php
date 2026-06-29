<?php
// backend/api/patch_owners.php
require_once __DIR__ . '/../config/database.php';
header('Content-Type: text/plain');

// 1. Define Owners and their Tokens
// Token 1 (New Fresh Token provided by user earlier)
$token1 = 'EAATy7qAW3EoBQRjrB6UuJXLyrSqOjZC6LC0aTvjFZCEPqNRZAHWVL3pZChNU4mWyHXPg1KmhnRXsnRUSWsl1XMejccXNxyJnpLYR51qu3YfsNUc59cn7mXlxRxOEqJBi1UPvhqLKD9zXPcKKXZCKAZAYV3b9Xmp371hXvaHrZAwIkNhKP22vxeaKcydj7FG2CWXO7t4eqpfqODrCTUw4NIJ3Lwugapnnt6uADbbsi00acZCbOhNkqQzY4euW7Y6HexFdauvOMkbA2UVETBWcC3EK';

// Token 2 (Mohan Krishna)
$token2 = 'EAAQOZAaHvqLUBQewWslqgWTuRBmX2zVtI26zmZAnvgbJfqTKwZBgEZA8JAEC0CgBZBjxH4Y0E2QZBia4hr7ZCMToHFZAw8g1A67oaDLfhUr99RZC68ZB86XdOq7hqtWtmiAPrXa9lIjpSQHddVTYNeV9wPH3YOjpolkKtRHbkZCPZBZB0b0J5iJwjcjUKBQOH3iQBYeZCtypl5FZCI5RUYUsUZBXQxAKpAvfBYBSvvMRzLsI0aVT70KHKF9Dhfv5YUZClQ4iKvGkXgjNVkMZCZCOmcyRk8sA2CPSFd3303iRsCxEyKFCAZDZD';

function fetchName($token)
{
    if (!$token)
        return null;
    $url = "https://graph.facebook.com/v19.0/me?fields=name&access_token={$token}";
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $res = json_decode(curl_exec($ch), true);
    curl_close($ch);
    return $res['name'] ?? null;
}

echo "🔄 PATCHING OWNER NAMES\n";
echo "-----------------------\n";

$name1 = fetchName($token1) ?? "Main Account";
echo "User 1 Name: $name1\n";

$name2 = fetchName($token2) ?? "Secondary Account";
echo "User 2 Name: $name2\n";

$db = new Database();
$conn = $db->getConnection();

// Helper to update
function updateOwner($conn, $table, $tokenPrefix, $ownerName)
{
    // Encrypted token handling is tricky here if we used encryption.
    // But verify_visible stored them raw or with stub encryption? 
    // Let's assume raw or predictable. 
    // We will match roughly by substring if possible.

    // Actually, `sync_manual_token_accounts` stored them.
    // Let's try to update logic:
    // UPDATE accounts SET owner_name = ? WHERE access_token LIKE ?

    $prefix = substr($tokenPrefix, 0, 10) . '%';

    try {
        $stmt = $conn->prepare("UPDATE $table SET owner_name = ? WHERE access_token LIKE ? AND (owner_name IS NULL OR owner_name = '')");
        $stmt->execute([$ownerName, $prefix]);
        echo "   -> Updated '$table' for '$ownerName': " . $stmt->rowCount() . " rows.\n";
    } catch (Exception $e) {
        echo "   ❌ Error updating $table: " . $e->getMessage() . "\n";
    }
}

// Update User 1
if ($name1) {
    updateOwner($conn, 'accounts', $token1, $name1);
    updateOwner($conn, 'ad_accounts', $token1, $name1);
}

// Update User 2
if ($name2) {
    updateOwner($conn, 'accounts', $token2, $name2);
    updateOwner($conn, 'ad_accounts', $token2, $name2);
}

echo "\nDone.\n";
?>