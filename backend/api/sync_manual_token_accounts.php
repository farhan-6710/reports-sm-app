<?php
// backend/api/sync_manual_token_accounts.php

// 1. VALIDATED TOKEN
$manual_token = 'EAAQOZAaHvqLUBQewWslqgWTuRBmX2zVtI26zmZAnvgbJfqTKwZBgEZA8JAEC0CgBZBjxH4Y0E2QZBia4hr7ZCMToHFZAw8g1A67oaDLfhUr99RZC68ZB86XdOq7hqtWtmiAPrXa9lIjpSQHddVTYNeV9wPH3YOjpolkKtRHbkZCPZBZB0b0J5iJwjcjUKBQOH3iQBYeZCtypl5FZCI5RUYUsUZBXQxAKpAvfBYBSvvMRzLsI0aVT70KHKF9Dhfv5YUZClQ4iKvGkXgjNVkMZCZCOmcyRk8sA2CPSFd3303iRsCxEyKFCAZDZD';

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/crypto.php'; // For encryption if used

function encryptTokenStub($t)
{
    return $t;
} // Fallback if crypto not found
if (!function_exists('encryptToken')) {
    function encryptToken($t)
    {
        return $t;
    }
}

header('Content-Type: text/plain');
echo "🚀 STARTING ACCOUNT SYNC...\n";
echo "Token: " . substr($manual_token, 0, 15) . "...\n";

// A. FETCH TOKEN OWNER
$owner_name = "Unknown Owner";
$url_me = "https://graph.facebook.com/v19.0/me?fields=name,id&access_token={$manual_token}";
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url_me);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$res_me = json_decode(curl_exec($ch), true);
curl_close($ch);

if (isset($res_me['name'])) {
    $owner_name = $res_me['name'];
    echo "👤 Access Token belongs to: $owner_name\n";
} else {
    echo "⚠️ Could not fetch token owner name.\n";
}

// Database Connection
$db = new Database();
$conn = $db->getConnection();

// --- 1. SYNC FACEBOOK PAGES & INSTAGRAM ---
echo "\n1️⃣ FECTHING PAGES & INSTAGRAM ACCOUNTS...\n";

$url_pages = "https://graph.facebook.com/v19.0/me/accounts?fields=name,id,instagram_business_account,access_token&limit=100&access_token={$manual_token}";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url_pages);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response_pages = curl_exec($ch);
curl_close($ch);

$pages_data = json_decode($response_pages, true);
$synced_count = 0;

if (isset($pages_data['data'])) {
    foreach ($pages_data['data'] as $page) {
        $page_name = $page['name'];
        $page_id = $page['id'];
        $page_token = $page['access_token'] ?? $manual_token; // Use manual token if page token missing (though rare in me/accounts)

        // A. Insert FACEBOOK PAGE
        // echo "   Processing Page: $page_name ($page_id)\n";

        try {
            $stmt = $conn->prepare("
                INSERT INTO accounts (platform, account_name, account_id, access_token, is_active, owner_name, created_at, updated_at)
                VALUES ('facebook', ?, ?, ?, 1, ?, NOW(), NOW())
                ON DUPLICATE KEY UPDATE 
                    account_name = VALUES(account_name),
                    access_token = VALUES(access_token),
                    owner_name = VALUES(owner_name),
                    is_active = 1,
                    updated_at = NOW()
            ");
            // Encrypt token usually, but for debug we might skip or use simple func
            $stmt->execute([$page_name, $page_id, encryptToken($page_token), $owner_name]);
            $synced_count++;
        } catch (Exception $e) {
            echo "   ❌ Error saving Page $page_name: " . $e->getMessage() . "\n";
        }

        // B. Insert INSTAGRAM (if linked)
        if (isset($page['instagram_business_account'])) {
            $ig = $page['instagram_business_account'];
            $ig_id = $ig['id'];
            // We'll trust the page token works for IG Basic Display too usually, or use user token
            // Ideally we fetch IG specific details but let's just insert ID for now so it appears
            $ig_name = $page_name . " (IG)"; // Placeholder until we fetch real handle

            // echo "   Processing IG: $ig_id\n";

            try {
                $stmt = $conn->prepare("
                    INSERT INTO accounts (platform, account_name, account_id, access_token, is_active, owner_name, created_at, updated_at)
                    VALUES ('instagram', ?, ?, ?, 1, ?, NOW(), NOW())
                    ON DUPLICATE KEY UPDATE 
                        access_token = VALUES(access_token),
                        owner_name = VALUES(owner_name),
                        is_active = 1,
                        updated_at = NOW()
                ");
                $stmt->execute([$ig_name, $ig_id, encryptToken($page_token), $owner_name]);
                $synced_count++;
            } catch (Exception $e) {
                echo "   ❌ Error saving IG $ig_id: " . $e->getMessage() . "\n";
            }
        }
    }
    echo "✅ Processed " . count($pages_data['data']) . " pages from API.\n";
} else {
    echo "❌ Failed to fetch Pages.\n";
    print_r($pages_data);
}


// --- 2. SYNC AD ACCOUNTS ---
echo "\n2️⃣ FETCHING AD ACCOUNTS...\n";
$url_ads = "https://graph.facebook.com/v19.0/me/adaccounts?fields=name,account_id,currency&limit=100&access_token={$manual_token}";

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $url_ads);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response_ads = curl_exec($ch);
curl_close($ch);

$ads_data = json_decode($response_ads, true);

if (isset($ads_data['data'])) {
    foreach ($ads_data['data'] as $acc) {
        $ad_id = str_replace('act_', '', $acc['account_id']); // Strip 'act_' prefix if present
        $ad_name = $acc['name'];
        $currency = $acc['currency'] ?? 'USD';

        // echo "   Processing Ad Account: $ad_name ($ad_id)\n";

        // We need to check if 'ad_accounts' table exists or if we map to 'accounts'
        // Based on previous reads, there is an 'accounts' table. 
        // Some schemas use a separate 'ad_accounts' table. 
        // Let's try to insert into 'ad_accounts' first, if fail, we might need a different strategy.
        // Wait, looking at auto_connect.php, there IS an `ad_accounts` table!

        try {
            $stmt = $conn->prepare("
                INSERT INTO ad_accounts (client_name, ad_account_id, access_token, currency, account_name, is_active, owner_name, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 1, ?, NOW(), NOW())
                ON DUPLICATE KEY UPDATE 
                    access_token = VALUES(access_token),
                    account_name = VALUES(account_name),
                    owner_name = VALUES(owner_name),
                    is_active = 1,
                    updated_at = NOW()
            ");
            $stmt->execute([$ad_name, $ad_id, encryptToken($manual_token), $currency, $ad_name, $owner_name]);
            $synced_count++;
        } catch (Exception $e) {
            // Silently fail or log if table doesn't exist etc
            echo "   ⚠️ Could not save to 'ad_accounts': " . $e->getMessage() . "\n";

            // Fallback: Check if we can save to 'accounts' table with platform='ads'? 
            // Usually report system separates them. Let's assume table exists as per auto_connect.php
        }
    }
    echo "✅ Processed " . count($ads_data['data']) . " ad accounts.\n";
} else {
    echo "❌ Failed to fetch Ad Accounts.\n";
}

echo "\n---------------------------------------------------\n";
echo "🎉 SYNC COMPLETE!\n";
echo "Go to your Dashboard -> Manage Accounts to see them.\n";
?>