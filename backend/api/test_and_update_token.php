<?php
/**
 * Test and Update Ad Account Token
 * This script will:
 * 1. Test the provided token with Facebook API
 * 2. Update the ad account in the database with the new token
 */

// Suppress output before headers
ob_start();

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/crypto.php';

ob_end_clean();

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");

// Get parameters
$input = json_decode(file_get_contents('php://input'), true);
if (!$input) {
    $input = $_GET;
}

$accessToken = $input['access_token'] ?? '';
$adAccountId = $input['ad_account_id'] ?? '';
$clientName = $input['client_name'] ?? 'elham';
$currency = $input['currency'] ?? 'INR';

if (empty($accessToken) || empty($adAccountId)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => 'Access token and Ad Account ID are required'
    ]);
    exit;
}

try {
    // Step 1: Test the token with Facebook API
    echo "Testing token with Facebook API...\n";
    
    // Test 1: Get account info
    $testUrl = "https://graph.facebook.com/v18.0/act_{$adAccountId}?fields=id,name,account_status,currency&access_token={$accessToken}";
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $testUrl);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    $testResult = json_decode($response, true);
    
    if ($httpCode !== 200 || isset($testResult['error'])) {
        echo json_encode([
            'success' => false,
            'error' => 'Token validation failed',
            'facebook_error' => $testResult['error'] ?? 'Unknown error',
            'http_code' => $httpCode,
            'response' => $testResult
        ]);
        exit;
    }
    
    // Step 2: Update database
    $db = new Database();
    $conn = $db->getConnection();
    
    // Check if account exists
    $checkStmt = $conn->prepare("SELECT * FROM ad_accounts WHERE ad_account_id = ?");
    $checkStmt->execute([$adAccountId]);
    $existingAccount = $checkStmt->fetch(PDO::FETCH_ASSOC);
    
    if ($existingAccount) {
        // Update existing account
        $updateStmt = $conn->prepare("
            UPDATE ad_accounts 
            SET access_token = ?, 
                client_name = ?,
                currency = ?,
                account_name = ?,
                is_active = 1,
                updated_at = NOW()
            WHERE ad_account_id = ?
        ");
        
        // Store token as-is (not encrypted, since ad_accounts.php doesn't decrypt)
        $updateStmt->execute([
            $accessToken,
            $clientName,
            $currency,
            $clientName,
            $adAccountId
        ]);
        
        $message = "Ad account updated successfully";
    } else {
        // Insert new account
        $insertStmt = $conn->prepare("
            INSERT INTO ad_accounts (client_name, ad_account_id, access_token, currency, account_name, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, 1, NOW())
        ");
        
        $insertStmt->execute([
            $clientName,
            $adAccountId,
            $accessToken,
            $currency,
            $clientName
        ]);
        
        $message = "Ad account created successfully";
    }
    
    // Step 3: Verify the update
    $verifyStmt = $conn->prepare("SELECT * FROM ad_accounts WHERE ad_account_id = ?");
    $verifyStmt->execute([$adAccountId]);
    $updatedAccount = $verifyStmt->fetch(PDO::FETCH_ASSOC);
    
    // Don't expose the full token in response
    if ($updatedAccount) {
        $updatedAccount['access_token'] = substr($updatedAccount['access_token'], 0, 20) . '...';
    }
    
    echo json_encode([
        'success' => true,
        'message' => $message,
        'token_test' => [
            'valid' => true,
            'account_info' => $testResult
        ],
        'database' => [
            'updated' => true,
            'account' => $updatedAccount
        ]
    ]);
    
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>

