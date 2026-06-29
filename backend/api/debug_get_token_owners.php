<?php
// backend/api/debug_get_token_owners.php

// Token 1 (EAAT...)
$token1 = 'EAATy7qAW3EoBQRjrB6UuJXLyrSqOjZC6LC0aTvjFZCEPqNRZAHWVL3pZChNU4mWyHXPg1KmhnRXsnRUSWsl1XMejccXNxyJnpLYR51qu3YfsNUc59cn7mXlxRxOEqJBi1UPvhqLKD9zXPcKKXZCKAZAYV3b9Xmp371hXvaHrZAwIkNhKP22vxeaKcydj7FG2CWXO7t4eqpfqODrCTUw4NIJ3Lwugapnnt6uADbbsi00acZCbOhNkqQzY4euW7Y6HexFdauvOMkbA2UVETBWcC3EK';

// Token 2 (EAAQ...)
$token2 = 'EAAQOZAaHvqLUBQewWslqgWTuRBmX2zVtI26zmZAnvgbJfqTKwZBgEZA8JAEC0CgBZBjxH4Y0E2QZBia4hr7ZCMToHFZAw8g1A67oaDLfhUr99RZC68ZB86XdOq7hqtWtmiAPrXa9lIjpSQHddVTYNeV9wPH3YOjpolkKtRHbkZCPZBZB0b0J5iJwjcjUKBQOH3iQBYeZCtypl5FZCI5RUYUsUZBXQxAKpAvfBYBSvvMRzLsI0aVT70KHKF9Dhfv5YUZClQ4iKvGkXgjNVkMZCZCOmcyRk8sA2CPSFd3303iRsCxEyKFCAZDZD';

function getOwnerName($token)
{
    $url = "https://graph.facebook.com/v19.0/me?fields=name,id&access_token={$token}";
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);
    curl_close($ch);
    return json_decode($response, true);
}

header('Content-Type: text/plain');

echo "👤 CHECKING TOKEN OWNERS\n";
echo "-----------------------\n";

$u1 = getOwnerName($token1);
if (isset($u1['name'])) {
    echo "1️⃣ Token 1 (EAAT...) belongs to: " . $u1['name'] . " (ID: " . $u1['id'] . ")\n";
} else {
    echo "❌ Token 1 Error: " . json_encode($u1) . "\n";
}

$u2 = getOwnerName($token2);
if (isset($u2['name'])) {
    echo "2️⃣ Token 2 (EAAQ...) belongs to: " . $u2['name'] . " (ID: " . $u2['id'] . ")\n";
} else {
    echo "❌ Token 2 Error: " . json_encode($u2) . "\n";
}
?>