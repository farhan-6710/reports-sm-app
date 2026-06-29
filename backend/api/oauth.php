<?php
/**
 * OAuth Routes
 * Handle Facebook Login flow and token management
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../auth/FacebookOAuth.php';

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);

// Initialize OAuth handler
$oauth = new FacebookOAuth();

// GET /oauth/login - Initiate OAuth flow
if ($method === 'GET' && strpos($path, '/oauth/login') !== false) {
    try {
        // Generate state token for CSRF protection
        $state = bin2hex(random_bytes(16));
        
        // Store state in session for verification
        session_start();
        $_SESSION['oauth_state'] = $state;
        
        // Get login URL
        $loginUrl = $oauth->getLoginUrl($state);
        
        // Redirect to Facebook Login
        header('Location: ' . $loginUrl);
        exit;
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
    exit;
}

// GET /oauth/callback - Handle OAuth callback
if ($method === 'GET' && strpos($path, '/auth/meta/callback') !== false) {
    try {
        session_start();
        
        // Verify state to prevent CSRF
        $state = $_GET['state'] ?? '';
        $expectedState = $_SESSION['oauth_state'] ?? '';
        
        if ($state !== $expectedState) {
            throw new Exception('Invalid state parameter');
        }
        
        // Get authorization code
        $code = $_GET['code'] ?? '';
        
        if (empty($code)) {
            throw new Exception('No authorization code received');
        }
        
        // Complete OAuth flow and get page tokens
        $result = $oauth->completeOAuthFlow($code);
        
        // Store tokens in database
        $db = new Database();
        $conn = $db->getConnection();
        
        // Store each page
        foreach ($result['pages'] as $page) {
            $stmt = $conn->prepare("
                INSERT INTO accounts (platform, account_name, account_id, access_token, is_active)
                VALUES ('facebook', ?, ?, ?, 1)
                ON DUPLICATE KEY UPDATE
                    account_name = VALUES(account_name),
                    access_token = VALUES(access_token),
                    updated_at = NOW()
            ");
            
            $stmt->execute([
                $page['name'],
                $page['id'],
                $page['access_token']
            ]);
            
            // Check for Instagram account
            $igAccount = getInstagramAccount($page['id'], $page['access_token']);
            
            if ($igAccount) {
                $stmt = $conn->prepare("
                    INSERT INTO accounts (platform, account_name, account_id, access_token, is_active)
                    VALUES ('instagram', ?, ?, ?, 1)
                    ON DUPLICATE KEY UPDATE
                        account_name = VALUES(account_name),
                        access_token = VALUES(access_token),
                        updated_at = NOW()
                ");
                
                $stmt->execute([
                    $igAccount['username'] ?? 'Instagram Account',
                    $igAccount['id'],
                    $page['access_token'] // Same token as Page
                ]);
            }
        }
        
        // Redirect to dashboard with success message
        header('Location: http://localhost:3000?oauth=success&pages=' . count($result['pages']));
        exit;
        
    } catch (Exception $e) {
        http_response_code(500);
        header('Location: http://localhost:3000?oauth=error&message=' . urlencode($e->getMessage()));
        exit;
    }
}

// POST /oauth/refresh - Refresh tokens
if ($method === 'POST' && strpos($path, '/oauth/refresh') !== false) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        $accountId = $input['account_id'] ?? '';
        
        if (empty($accountId)) {
            throw new Exception('Account ID required');
        }
        
        // Get current token from database
        $db = new Database();
        $conn = $db->getConnection();
        
        $stmt = $conn->prepare("SELECT * FROM accounts WHERE account_id = ?");
        $stmt->execute([$accountId]);
        $account = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$account) {
            throw new Exception('Account not found');
        }
        
        // Exchange for new long-lived token
        $newTokenData = $oauth->exchangeForLongLivedToken($account['access_token']);
        
        // Update in database
        $stmt = $conn->prepare("UPDATE accounts SET access_token = ?, updated_at = NOW() WHERE account_id = ?");
        $stmt->execute([$newTokenData['access_token'], $accountId]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Token refreshed successfully',
            'expires_in' => $newTokenData['expires_in']
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
    exit;
}

// Helper function to get Instagram account
function getInstagramAccount($pageId, $pageToken) {
    $url = "https://graph.facebook.com/v18.0/{$pageId}";
    $params = [
        'fields' => 'instagram_business_account',
        'access_token' => $pageToken
    ];
    
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    
    $response = curl_exec($ch);
    curl_close($ch);
    
    $data = json_decode($response, true);
    
    return $data['instagram_business_account'] ?? null;
}

http_response_code(404);
echo json_encode(['success' => false, 'error' => 'Endpoint not found']);
?>

