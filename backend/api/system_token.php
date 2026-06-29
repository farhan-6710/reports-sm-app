<?php
/**
 * System Token Management
 * Use a single System User Token to access all pages/accounts
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/crypto.php';

header('Content-Type: application/json');

// Handle OPTIONS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'fetch_all_accounts':
            handleFetchAllAccounts();
            break;
        case 'save_token':
            handleSaveToken();
            break;
        case 'get_token_status':
            handleGetTokenStatus();
            break;
        default:
            sendJson(['success' => false, 'error' => 'Invalid action'], 400);
    }
} catch (Exception $e) {
    error_log('System token error: ' . $e->getMessage());
    sendJson(['success' => false, 'error' => $e->getMessage()], 500);
}

function handleSaveToken(): void {
    $input = json_decode(file_get_contents('php://input'), true);
    $token = $input['token'] ?? '';
    
    if (empty($token)) {
        throw new Exception('Token is required');
    }
    
    // Validate token by making a test API call
    $testUrl = 'https://graph.facebook.com/' . FACEBOOK_API_VERSION . '/me';
    $response = callGraphAPI($testUrl, ['access_token' => $token]);
    
    if (isset($response['error'])) {
        throw new Exception('Invalid token: ' . $response['error']['message']);
    }
    
    // Exchange for long-lived token if needed
    $longLived = exchangeForLongLivedToken($token);
    $finalToken = $longLived['access_token'] ?? $token;
    
    // Save to config or database
    $encryptedToken = encryptToken($finalToken);
    
    // Store in database (create a system_tokens table or use config)
    $db = new Database();
    $conn = $db->getConnection();
    
    // Create table if doesn't exist
    $conn->exec("
        CREATE TABLE IF NOT EXISTS system_tokens (
            id INT AUTO_INCREMENT PRIMARY KEY,
            token_type VARCHAR(50) DEFAULT 'system_user',
            encrypted_token TEXT NOT NULL,
            expires_at DATETIME NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        )
    ");
    
    $stmt = $conn->prepare("
        INSERT INTO system_tokens (encrypted_token, expires_at)
        VALUES (?, DATE_ADD(NOW(), INTERVAL ? DAY))
        ON DUPLICATE KEY UPDATE
            encrypted_token = VALUES(encrypted_token),
            expires_at = VALUES(expires_at),
            updated_at = NOW()
    ");
    
    $expiresInDays = isset($longLived['expires_in']) ? ($longLived['expires_in'] / 86400) : 60;
    $stmt->execute([$encryptedToken, $expiresInDays]);
    
    sendJson([
        'success' => true,
        'message' => 'System token saved successfully',
        'expires_in_days' => round($expiresInDays)
    ]);
}

function handleFetchAllAccounts(): void {
    $token = getSystemToken();
    
    if (empty($token)) {
        throw new Exception('System token not configured. Please save a token first.');
    }
    
    // Fetch all pages
    $pages = fetchAllPages($token);
    
    // Fetch all ad accounts (if token has ads permissions)
    $adAccounts = [];
    try {
        $adAccounts = fetchAllAdAccounts($token);
    } catch (Exception $e) {
        // Ads not available, that's okay
        error_log('Ad accounts not available: ' . $e->getMessage());
    }
    
    sendJson([
        'success' => true,
        'pages' => $pages,
        'ad_accounts' => $adAccounts,
        'total_pages' => count($pages),
        'total_ad_accounts' => count($adAccounts)
    ]);
}

function handleGetTokenStatus(): void {
    $token = getSystemToken();
    
    if (empty($token)) {
        sendJson([
            'success' => false,
            'configured' => false,
            'message' => 'No system token configured'
        ]);
        return;
    }
    
    // Test token validity
    try {
        $testUrl = 'https://graph.facebook.com/' . FACEBOOK_API_VERSION . '/me';
        $response = callGraphAPI($testUrl, ['access_token' => $token]);
        
        if (isset($response['error'])) {
            sendJson([
                'success' => false,
                'configured' => true,
                'valid' => false,
                'error' => $response['error']['message']
            ]);
            return;
        }
        
        sendJson([
            'success' => true,
            'configured' => true,
            'valid' => true,
            'user_id' => $response['id'] ?? null,
            'user_name' => $response['name'] ?? null
        ]);
    } catch (Exception $e) {
        sendJson([
            'success' => false,
            'configured' => true,
            'valid' => false,
            'error' => $e->getMessage()
        ]);
    }
}

function getSystemToken(): ?string {
    $db = new Database();
    $conn = $db->getConnection();
    
    try {
        $stmt = $conn->query("SELECT encrypted_token FROM system_tokens ORDER BY updated_at DESC LIMIT 1");
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($row && !empty($row['encrypted_token'])) {
            return decryptToken($row['encrypted_token']);
        }
    } catch (Exception $e) {
        // Table doesn't exist or no token
    }
    
    return null;
}

function fetchAllPages(string $token): array {
    // Try /me/accounts first (user token)
    // If that fails, try Business Manager API (system user token)
    $url = 'https://graph.facebook.com/' . FACEBOOK_API_VERSION . '/me/accounts';
    $params = [
        'fields' => 'id,name,access_token,category,instagram_business_account{id,username,profile_picture_url}',
        'limit' => 100,
        'access_token' => $token
    ];
    
    try {
        $response = callGraphAPI($url, $params);
        return $response['data'] ?? [];
    } catch (Exception $e) {
        // If /me/accounts fails, try Business Manager API
        // This requires business_management permission
        try {
            $bmUrl = 'https://graph.facebook.com/' . FACEBOOK_API_VERSION . '/me/businesses';
            $bmResponse = callGraphAPI($bmUrl, ['access_token' => $token, 'fields' => 'id,name']);
            // For now, return empty - would need to fetch pages from each business
            return [];
        } catch (Exception $e2) {
            throw new Exception('Unable to fetch pages: ' . $e->getMessage());
        }
    }
}

function fetchAllAdAccounts(string $token): array {
    $url = 'https://graph.facebook.com/' . FACEBOOK_API_VERSION . '/me/adaccounts';
    $params = [
        'fields' => 'id,name,account_id,currency,account_status',
        'limit' => 100,
        'access_token' => $token
    ];
    
    $response = callGraphAPI($url, $params);
    return $response['data'] ?? [];
}

function exchangeForLongLivedToken(string $shortToken): array {
    $url = 'https://graph.facebook.com/' . FACEBOOK_API_VERSION . '/oauth/access_token';
    $params = [
        'grant_type' => 'fb_exchange_token',
        'client_id' => FACEBOOK_APP_ID,
        'client_secret' => FACEBOOK_APP_SECRET,
        'fb_exchange_token' => $shortToken
    ];
    
    return callGraphAPI($url, $params);
}

function callGraphAPI(string $url, array $params): array {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);
    
    $data = json_decode($response, true);
    
    if ($httpCode >= 400) {
        throw new Exception($data['error']['message'] ?? 'Graph API error');
    }
    
    return $data;
}

function sendJson(array $payload, int $status = 200): void {
    http_response_code($status);
    echo json_encode($payload);
    exit;
}
?>

