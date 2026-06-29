<?php
/**
 * Facebook OAuth Login Flow
 * Allow clients to login and grant permissions directly
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../utils/crypto.php';

header('Content-Type: application/json');

$action = $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'get_login_url':
            handleGetLoginUrl();
            break;
        case 'exchange_token':
            handleExchangeToken();
            break;
        case 'get_accounts':
            handleGetAccounts();
            break;
        case 'connect_accounts':
            handleConnectAccounts();
            break;
        default:
            sendJson(['success' => false, 'error' => 'Invalid action'], 404);
    }
} catch (Exception $e) {
    error_log('OAuth error: ' . $e->getMessage());
    sendJson(['success' => false, 'error' => $e->getMessage()], 500);
}

function handleGetLoginUrl(): void {
    $type = $_GET['type'] ?? 'organic';
    $type = in_array($type, ['organic', 'ads'], true) ? $type : 'organic';

    $state = bin2hex(random_bytes(16));
    $db = getDb();

    $stmt = $db->prepare("INSERT INTO oauth_states (state_token, request_type) VALUES (?, ?)");
    $stmt->execute([$state, $type]);

    $loginUrl = 'https://www.facebook.com/' . FACEBOOK_API_VERSION . '/dialog/oauth?' . http_build_query([
        'client_id' => FACEBOOK_APP_ID,
        'redirect_uri' => FACEBOOK_REDIRECT_URI,
        'scope' => implode(',', getScopesForType($type)),
        'state' => $state,
        'response_type' => 'code'
    ]);

    sendJson([
        'success' => true,
        'login_url' => $loginUrl,
        'state' => $state,
        'type' => $type
    ]);
}

function handleExchangeToken(): void {
    $code = $_GET['code'] ?? '';
    $state = $_GET['state'] ?? '';

    if (empty($code) || empty($state)) {
        throw new Exception('Authorization code and state are required');
    }

    $stateRow = getStateRow($state);
    if (!$stateRow) {
        throw new Exception('Invalid or expired state token');
    }

    validateStateFreshness($stateRow);

    $tokenData = exchangeCodeForToken($code);
    $longLived = exchangeForLongLivedToken($tokenData['access_token']);
    
    // Get Facebook user info to track who connected this account
    $userInfo = getFacebookUserInfo($longLived['access_token']);

    $db = getDb();
    $stmt = $db->prepare("
        UPDATE oauth_states 
        SET access_token = ?, token_type = ?, token_expires_at = DATE_ADD(NOW(), INTERVAL ? SECOND), 
            facebook_user_id = ?, facebook_user_name = ?, 
            metadata = JSON_OBJECT('issued_at', NOW(), 'user_id', ?, 'user_name', ?)
        WHERE id = ?
    ");
    $encryptedToken = encryptToken($longLived['access_token']);
    $expiresIn = $longLived['expires_in'] ?? 5184000;
    $fbUserId = $userInfo['id'] ?? null;
    $fbUserName = $userInfo['name'] ?? null;
    $stmt->execute([$encryptedToken, $longLived['token_type'] ?? 'bearer', $expiresIn, $fbUserId, $fbUserName, $fbUserId, $fbUserName, $stateRow['id']]);

    sendJson([
        'success' => true,
        'state' => $state,
        'expires_in' => $expiresIn
    ]);
}

function handleGetAccounts(): void {
    $state = $_GET['state'] ?? '';
    if (empty($state)) {
        throw new Exception('State is required');
    }

    $stateRow = getStateRow($state);
    if (!$stateRow || empty($stateRow['access_token'])) {
        throw new Exception('State not authorized yet. Please complete login.');
    }

    validateStateFreshness($stateRow);

    $accessToken = decryptToken($stateRow['access_token']);
    $type = $stateRow['request_type'];

    if ($type !== 'organic') {
        throw new Exception('Ads flow is not enabled yet');
    }

    $accounts = fetchOrganicAccounts($accessToken, false);

    sendJson([
        'success' => true,
        'accounts' => $accounts
    ]);
}

function handleConnectAccounts(): void {
    $payload = json_decode(file_get_contents('php://input'), true);
    $state = $payload['state'] ?? '';
    $selectedIds = $payload['selected_ids'] ?? [];

    if (empty($state) || empty($selectedIds) || !is_array($selectedIds)) {
        throw new Exception('State and selected account IDs are required');
    }

    $stateRow = getStateRow($state);
    if (!$stateRow || empty($stateRow['access_token'])) {
        throw new Exception('State not authorized');
    }

    validateStateFreshness($stateRow);

    $accessToken = decryptToken($stateRow['access_token']);
    $type = $stateRow['request_type'];

    $connected = [];

    if ($type === 'organic') {
        $connected = connectOrganicAccounts($accessToken, $selectedIds);
    } else {
        throw new Exception('Ads flow is not enabled yet');
    }

    $db = getDb();
    $stmt = $db->prepare("UPDATE oauth_states SET consumed_at = NOW() WHERE id = ?");
    $stmt->execute([$stateRow['id']]);

    sendJson([
        'success' => true,
        'connected_accounts' => $connected
    ]);
}

function connectOrganicAccounts(string $accessToken, array $selectedIds): array {
    $accountsWithTokens = fetchOrganicAccounts($accessToken, true);
    $selected = array_filter($accountsWithTokens, fn($acc) => in_array($acc['id'], $selectedIds, true));

    if (empty($selected)) {
        throw new Exception('No matching accounts found for the provided selections');
    }

    // Get Facebook user ID from the access token to associate accounts with user
    $userInfo = getFacebookUserInfo($accessToken);
    $facebookUserId = $userInfo['id'] ?? null;
    
    // Get or create user record based on Facebook user ID
    $userId = getOrCreateUserFromFacebook($facebookUserId, $userInfo['name'] ?? 'Facebook User');

    $db = getDb();
    $insertStmt = $db->prepare("
        INSERT INTO accounts (user_id, platform, account_name, account_id, access_token, is_active)
        VALUES (?, ?, ?, ?, ?, 1)
        ON DUPLICATE KEY UPDATE
            account_name = VALUES(account_name),
            access_token = VALUES(access_token),
            is_active = 1,
            updated_at = NOW()
    ");

    $saved = [];

    foreach ($selected as $page) {
        if (empty($page['access_token'])) {
            // Fetch page token explicitly if missing
            $page['access_token'] = fetchPageToken($page['id'], $accessToken);
        }

        $encryptedPageToken = encryptToken($page['access_token']);
        $insertStmt->execute([$userId, 'facebook', $page['name'], $page['id'], $encryptedPageToken]);
        $saved[] = [
            'platform' => 'facebook',
            'account_name' => $page['name'],
            'account_id' => $page['id']
        ];

        if (!empty($page['instagram_business_account'])) {
            $ig = $page['instagram_business_account'];
            $igName = $ig['username'] ?? ('Instagram ' . $page['name']);
            $encryptedIgToken = encryptToken($page['access_token']);
            $insertStmt->execute([$userId, 'instagram', '@' . $igName, $ig['id'], $encryptedIgToken]);
            $saved[] = [
                'platform' => 'instagram',
                'account_name' => '@' . $igName,
                'account_id' => $ig['id']
            ];
        }
    }

    return $saved;
}

function fetchOrganicAccounts(string $accessToken, bool $includeTokens = false): array {
    $url = 'https://graph.facebook.com/' . FACEBOOK_API_VERSION . '/me/accounts';
    $params = [
        'fields' => 'id,name,access_token,instagram_business_account{id,username,profile_picture_url}',
        'limit' => 100,
        'access_token' => $accessToken
    ];

    $response = callGraph($url, $params);
    $data = $response['data'] ?? [];

    if (!$includeTokens) {
        foreach ($data as &$item) {
            unset($item['access_token']);
        }
    }

    return $data;
}

function fetchPageToken(string $pageId, string $userToken): string {
    $url = "https://graph.facebook.com/" . FACEBOOK_API_VERSION . "/{$pageId}";
    $params = [
        'fields' => 'access_token',
        'access_token' => $userToken
    ];
    $response = callGraph($url, $params);

    if (empty($response['access_token'])) {
        throw new Exception('Unable to retrieve page token for ' . $pageId);
    }

    return $response['access_token'];
}

function exchangeCodeForToken(string $code): array {
    $url = 'https://graph.facebook.com/' . FACEBOOK_API_VERSION . '/oauth/access_token';
    $params = [
        'client_id' => FACEBOOK_APP_ID,
        'client_secret' => FACEBOOK_APP_SECRET,
        'redirect_uri' => FACEBOOK_REDIRECT_URI,
        'code' => $code
    ];

    $response = callGraph($url, $params);

    if (empty($response['access_token'])) {
        throw new Exception('Failed to exchange authorization code');
    }

    return $response;
}

function exchangeForLongLivedToken(string $shortLivedToken): array {
    $url = 'https://graph.facebook.com/' . FACEBOOK_API_VERSION . '/oauth/access_token';
    $params = [
        'grant_type' => 'fb_exchange_token',
        'client_id' => FACEBOOK_APP_ID,
        'client_secret' => FACEBOOK_APP_SECRET,
        'fb_exchange_token' => $shortLivedToken
    ];

    $response = callGraph($url, $params);

    if (empty($response['access_token'])) {
        throw new Exception('Failed to get long-lived token');
    }

    return $response;
}

function getScopesForType(string $type): array {
    if ($type === 'ads') {
        return [
            'ads_read',
            'ads_management',
            'business_management'
        ];
    }

    return [
        'pages_show_list',
        'pages_read_engagement',
        'pages_read_user_content',
        'read_insights',
        'instagram_basic',
        'instagram_manage_insights',
        'business_management'
    ];
}

function callGraph(string $url, array $params): array {
    $ch = curl_init();
    curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($ch);
    if ($response === false) {
        $error = curl_error($ch);
        curl_close($ch);
        throw new Exception('Graph API request failed: ' . $error);
    }
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    curl_close($ch);

    $decoded = json_decode($response, true);

    if ($httpCode >= 400) {
        $errorMsg = $decoded['error']['message'] ?? 'Unknown Graph API error';
        throw new Exception($errorMsg);
    }

    return $decoded;
}

function getStateRow(string $state): ?array {
    $db = getDb();
    $stmt = $db->prepare("SELECT * FROM oauth_states WHERE state_token = ?");
    $stmt->execute([$state]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ?: null;
}

function validateStateFreshness(array $stateRow): void {
    $createdAt = strtotime($stateRow['created_at']);
    if ((time() - $createdAt) > OAUTH_STATE_TTL) {
        throw new Exception('OAuth session expired. Please restart the connection.');
    }
}

function getDb(): PDO {
    static $pdo = null;
    if ($pdo === null) {
        $db = new Database();
        $pdo = $db->getConnection();
    }
    return $pdo;
}

function getFacebookUserInfo(string $accessToken): array {
    $url = 'https://graph.facebook.com/' . FACEBOOK_API_VERSION . '/me';
    $params = [
        'fields' => 'id,name,email',
        'access_token' => $accessToken
    ];
    
    $response = callGraph($url, $params);
    return $response;
}

function getOrCreateUserFromFacebook(?string $facebookUserId, string $facebookUserName): ?int {
    if (empty($facebookUserId)) {
        return null; // No user tracking if we can't get Facebook user ID
    }
    
    $db = getDb();
    
    // Check if user exists by Facebook ID (stored in metadata or separate table)
    // For now, we'll use a simple approach: create user with Facebook ID as username
    $stmt = $db->prepare("SELECT id FROM users WHERE username = ? OR email = ?");
    $stmt->execute(['fb_' . $facebookUserId, 'fb_' . $facebookUserId . '@facebook.com']);
    $user = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($user) {
        return (int)$user['id'];
    }
    
    // Create new user
    $stmt = $db->prepare("
        INSERT INTO users (username, email, password, role) 
        VALUES (?, ?, ?, 'user')
    ");
    $username = 'fb_' . $facebookUserId;
    $email = $username . '@facebook.com';
    $password = password_hash(bin2hex(random_bytes(16)), PASSWORD_DEFAULT); // Random password, user won't login with it
    $stmt->execute([$username, $email, $password]);
    
    return (int)$db->lastInsertId();
}

function sendJson(array $payload, int $status = 200): void {
    http_response_code($status);
    echo json_encode($payload);
    exit;
}
?>

