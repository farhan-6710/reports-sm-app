<?php
/**
 * Script to find and fix the 90's Instagram account connection
 * This will help identify if the Facebook page is linked to Instagram
 */

require_once __DIR__ . '/backend/config/config.php';
require_once __DIR__ . '/backend/config/database.php';
require_once __DIR__ . '/backend/utils/crypto.php';

header('Content-Type: application/json');

echo "=== 90's Account Diagnostic Tool ===\n\n";

// Get the Facebook page ID for 90sauthentickitchen
$pageId = '650073251534023'; // We found this earlier

echo "1. Checking Facebook Page: $pageId (90sauthentickitchen)\n";

// You need to provide a valid access token here
// Get it from Graph API Explorer: https://developers.facebook.com/tools/explorer/
echo "\n2. To find the correct Instagram account:\n";
echo "   a) Go to: https://developers.facebook.com/tools/explorer/\n";
echo "   b) Select 'Graph API Explorer' app\n";
echo "   c) Generate token with permissions:\n";
echo "      - instagram_basic\n";
echo "      - instagram_manage_insights\n";
echo "      - pages_show_list\n";
echo "      - pages_read_engagement\n";
echo "   d) Run this query:\n";
echo "      me/accounts?fields=id,name,access_token,instagram_business_account{id,username}\n";
echo "   e) Find '90sauthentickitchen' in the results\n";
echo "   f) Check if 'instagram_business_account' field exists\n\n";

echo "3. If Instagram account is NOT linked:\n";
echo "   a) Open Instagram app\n";
echo "   b) Go to Settings → Account → Linked Accounts\n";
echo "   c) Link to Facebook Page: 90sauthentickitchen\n";
echo "   d) Make sure Instagram is Business/Creator account\n\n";

echo "4. Once you have the correct Instagram ID and token:\n";
echo "   Update the account in the dashboard or use this SQL:\n\n";

$sql = "UPDATE accounts 
        SET account_id = 'CORRECT_INSTAGRAM_ID',
            access_token = 'CORRECT_PAGE_TOKEN',
            is_active = 1
        WHERE account_name = \"90's\" AND platform = 'instagram'
        LIMIT 1;";

echo $sql . "\n\n";

// Check current database state
$db = new Database();
$conn = $db->getConnection();

$stmt = $conn->query("SELECT id, account_name, account_id, platform, is_active FROM accounts WHERE account_name LIKE '%90%'");
$accounts = $stmt->fetchAll(PDO::FETCH_ASSOC);

echo "5. Current 90's accounts in database:\n";
foreach ($accounts as $acc) {
    echo "   ID: {$acc['id']}, Name: {$acc['account_name']}, Account ID: {$acc['account_id']}, Active: {$acc['is_active']}\n";
}

echo "\n=== Next Steps ===\n";
echo "1. Verify Instagram is linked to Facebook page\n";
echo "2. Get correct Instagram Business Account ID from Graph API\n";
echo "3. Get Page Access Token (not user token)\n";
echo "4. Update account in dashboard with correct values\n";
echo "5. Test report generation\n";
