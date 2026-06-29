<?php
// backend/api/debug_check_tokens.php
require_once __DIR__ . '/../config/database.php';
header('Content-Type: text/plain');

$db = new Database();
$conn = $db->getConnection();

echo "🔑 TOKEN SEPARATION CHECK\n";
echo "-----------------------\n";

// Fetch a few accounts to see their tokens (truncated)
$stmt = $conn->query("
    SELECT account_name, access_token, platform 
    FROM accounts 
    WHERE is_active = 1 
    ORDER BY id DESC LIMIT 10
");
$accounts = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Last 10 Social Accounts:\n";
foreach ($accounts as $acc) {
    $token_preview = substr($acc['access_token'], 0, 15) . "...";
    echo "   - {$acc['account_name']} ({$acc['platform']}) -> Token: $token_preview\n";
}

echo "\n";

// Fetch Ads
$stmt = $conn->query("
    SELECT client_name, access_token 
    FROM ad_accounts 
    WHERE is_active = 1 
    ORDER BY id DESC LIMIT 10
");
$ads = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "Last 10 Ad Accounts:\n";
foreach ($ads as $acc) {
    $token_preview = substr($acc['access_token'], 0, 15) . "...";
    echo "   - {$acc['client_name']} -> Token: $token_preview\n";
}
?>