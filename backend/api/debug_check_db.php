<?php
// backend/api/debug_check_db.php
require_once __DIR__ . '/../config/database.php';
header('Content-Type: text/plain');

$db = new Database();
$conn = $db->getConnection();

echo "📊 DATABASE STATUS CHECK\n";
echo "-----------------------\n";

// Check Accounts
$stmt = $conn->query("SELECT COUNT(*) as count FROM accounts WHERE is_active = 1");
$count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
echo "✅ Active Social Accounts (Pages/IG): $count\n";

$stmt = $conn->query("SELECT platform, account_name FROM accounts WHERE is_active = 1 LIMIT 50");
$accounts = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($accounts as $acc) {
    echo "   - [{$acc['platform']}] {$acc['account_name']}\n";
}

echo "\n";

// Check Ad Accounts
$stmt = $conn->query("SELECT COUNT(*) as count FROM ad_accounts WHERE is_active = 1");
$ad_count = $stmt->fetch(PDO::FETCH_ASSOC)['count'];
echo "✅ Active Ad Accounts: $ad_count\n";

$stmt = $conn->query("SELECT client_name, ad_account_id FROM ad_accounts WHERE is_active = 1 LIMIT 50");
$ads = $stmt->fetchAll(PDO::FETCH_ASSOC);
foreach ($ads as $acc) {
    echo "   - [Ad] {$acc['client_name']} (ID: {$acc['ad_account_id']})\n";
}
?>