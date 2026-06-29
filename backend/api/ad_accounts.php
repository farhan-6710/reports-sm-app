<?php
/**
 * Ad Accounts Management API
 * CRUD operations for ad account credentials
 */

// --- 1. CORS HEADERS (Essential for React connection) ---
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// --- 2. HANDLE PREFLIGHT ---
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// --- 3. ERROR HANDLING ---
ini_set('display_errors', 0);
error_reporting(E_ALL);

try {
    // Include Config & Database safely
    if (file_exists(__DIR__ . '/../config/config.php')) {
        require_once __DIR__ . '/../config/config.php';
    }
    
    if (!file_exists(__DIR__ . '/../config/database.php')) {
        throw new Exception("Database config missing");
    }
    require_once __DIR__ . '/../config/database.php';
    
    // Include crypto helper for token decryption
    if (file_exists(__DIR__ . '/../utils/crypto.php')) {
        require_once __DIR__ . '/../utils/crypto.php';
    }

    $method = $_SERVER['REQUEST_METHOD'];

    // --- GET AD ACCOUNTS ---
    if ($method === 'GET') {
        $db = new Database();
        $conn = $db->getConnection();
        
        $stmt = $conn->prepare("SELECT * FROM ad_accounts WHERE is_active = 1 ORDER BY created_at DESC");
        $stmt->execute();
        $accounts = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Decrypt tokens if they're encrypted (backward compatibility)
        foreach ($accounts as &$account) {
            if (!empty($account['access_token']) && function_exists('decryptToken')) {
                // Try to decrypt - if it's already plaintext, decryptToken will return it as-is
                $account['access_token'] = decryptToken($account['access_token']);
            }
        }

        echo json_encode(['success' => true, 'data' => $accounts]);
        exit;
    }

    // --- ADD AD ACCOUNT ---
    if ($method === 'POST') {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $clientName = $input['client_name'] ?? '';
        $adAccountId = $input['ad_account_id'] ?? '';
        $accessToken = $input['access_token'] ?? '';
        $currency = $input['currency'] ?? 'INR';
        $accountName = $input['account_name'] ?? '';

        if (empty($clientName) || empty($adAccountId) || empty($accessToken)) {
            throw new Exception("Client name, ad account ID, and access token are required");
        }

        $db = new Database();
        $conn = $db->getConnection();
        
        $stmt = $conn->prepare("
            INSERT INTO ad_accounts (client_name, ad_account_id, access_token, currency, account_name, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, 1, NOW())
            ON DUPLICATE KEY UPDATE 
                client_name = VALUES(client_name),
                access_token = VALUES(access_token),
                currency = VALUES(currency),
                account_name = VALUES(account_name),
                is_active = 1,
                updated_at = NOW()
        ");
        
        $stmt->execute([$clientName, $adAccountId, $accessToken, $currency, $accountName]);

        echo json_encode(['success' => true, 'message' => 'Ad account added successfully']);
        exit;
    }

    // --- UPDATE AD ACCOUNT ---
    if ($method === 'PUT') {
        $accountId = $_GET['id'] ?? '';
        $input = json_decode(file_get_contents('php://input'), true);

        if (empty($accountId)) throw new Exception("Account ID required");

        $clientName = $input['client_name'] ?? '';
        $adAccountId = $input['ad_account_id'] ?? '';
        $accessToken = $input['access_token'] ?? '';
        $currency = $input['currency'] ?? 'INR';
        $accountName = $input['account_name'] ?? '';

        $db = new Database();
        $conn = $db->getConnection();

        if (!empty($accessToken)) {
            $stmt = $conn->prepare("UPDATE ad_accounts SET client_name=?, ad_account_id=?, access_token=?, currency=?, account_name=?, updated_at=NOW() WHERE id=?");
            $stmt->execute([$clientName, $adAccountId, $accessToken, $currency, $accountName, $accountId]);
        } else {
            $stmt = $conn->prepare("UPDATE ad_accounts SET client_name=?, ad_account_id=?, currency=?, account_name=?, updated_at=NOW() WHERE id=?");
            $stmt->execute([$clientName, $adAccountId, $currency, $accountName, $accountId]);
        }

        echo json_encode(['success' => true, 'message' => 'Ad account updated successfully']);
        exit;
    }

    // --- DELETE AD ACCOUNT ---
    if ($method === 'DELETE') {
        $accountId = $_GET['id'] ?? '';
        
        if (empty($accountId)) throw new Exception("Account ID required");

        $db = new Database();
        $conn = $db->getConnection();
        
        // Soft delete logic (or hard delete if you prefer)
        $stmt = $conn->prepare("DELETE FROM ad_accounts WHERE id = ?");
        $stmt->execute([$accountId]);

        echo json_encode(['success' => true, 'message' => 'Ad account deleted successfully']);
        exit;
    }

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>