<?php
/**
 * Auto-Connect All Accounts from System Token
 * Automatically saves all pages/accounts accessible by system token
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/crypto.php';
require_once __DIR__ . '/system_token.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        $selectedPageIds = $input['selected_page_ids'] ?? [];
        $selectedAdAccountIds = $input['selected_ad_account_ids'] ?? [];
        $autoConnectAll = $input['auto_connect_all'] ?? false;
        
        $token = getSystemToken();
        
        if (empty($token)) {
            throw new Exception('System token not configured');
        }
        
        $connected = [];
        
        // Connect pages
        if ($autoConnectAll || !empty($selectedPageIds)) {
            $pages = fetchAllPages($token);
            
            foreach ($pages as $page) {
                if ($autoConnectAll || in_array($page['id'], $selectedPageIds)) {
                    $pageToken = $page['access_token'] ?? fetchPageToken($page['id'], $token);
                    $connected[] = saveAccount('facebook', $page['name'], $page['id'], $pageToken);
                    
                    // Also save Instagram if linked
                    if (!empty($page['instagram_business_account'])) {
                        $ig = $page['instagram_business_account'];
                        $igName = '@' . ($ig['username'] ?? 'Instagram ' . $page['name']);
                        $connected[] = saveAccount('instagram', $igName, $ig['id'], $pageToken);
                    }
                }
            }
        }
        
        // Connect ad accounts
        if ($autoConnectAll || !empty($selectedAdAccountIds)) {
            try {
                $adAccounts = fetchAllAdAccounts($token);
                
                foreach ($adAccounts as $adAccount) {
                    $adAccountId = str_replace('act_', '', $adAccount['account_id']);
                    if ($autoConnectAll || in_array($adAccountId, $selectedAdAccountIds)) {
                        $connected[] = saveAdAccount(
                            $adAccount['name'] ?? 'Ad Account',
                            $adAccountId,
                            $token,
                            $adAccount['currency'] ?? 'USD'
                        );
                    }
                }
            } catch (Exception $e) {
                // Ads not available
            }
        }
        
        sendJson([
            'success' => true,
            'connected' => $connected,
            'total_connected' => count($connected)
        ]);
        
    } catch (Exception $e) {
        sendJson(['success' => false, 'error' => $e->getMessage()], 500);
    }
    exit;
}

function fetchPageToken(string $pageId, string $userToken): string {
    $url = 'https://graph.facebook.com/' . FACEBOOK_API_VERSION . '/' . $pageId;
    $params = [
        'fields' => 'access_token',
        'access_token' => $userToken
    ];
    
    $response = callGraphAPI($url, $params);
    return $response['access_token'] ?? $userToken;
}

function saveAccount(string $platform, string $name, string $accountId, string $token): array {
    $db = new Database();
    $conn = $db->getConnection();
    
    $encryptedToken = encryptToken($token);
    
    $stmt = $conn->prepare("
        INSERT INTO accounts (platform, account_name, account_id, access_token, is_active)
        VALUES (?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE
            account_name = VALUES(account_name),
            access_token = VALUES(access_token),
            is_active = 1,
            updated_at = NOW()
    ");
    
    $stmt->execute([$platform, $name, $accountId, $encryptedToken]);
    
    return [
        'platform' => $platform,
        'account_name' => $name,
        'account_id' => $accountId
    ];
}

function saveAdAccount(string $name, string $adAccountId, string $token, string $currency): array {
    $db = new Database();
    $conn = $db->getConnection();
    
    $encryptedToken = encryptToken($token);
    
    $stmt = $conn->prepare("
        INSERT INTO ad_accounts (client_name, ad_account_id, access_token, currency, account_name, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE
            access_token = VALUES(access_token),
            currency = VALUES(currency),
            account_name = VALUES(account_name),
            is_active = 1,
            updated_at = NOW()
    ");
    
    $stmt->execute([$name, $adAccountId, $encryptedToken, $currency, $name]);
    
    return [
        'platform' => 'campaigns',
        'account_name' => $name,
        'account_id' => $adAccountId
    ];
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

