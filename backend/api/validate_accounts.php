<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

require_once __DIR__ . '/../config/Database.php';
require_once __DIR__ . '/../services/InstagramService.php';
require_once __DIR__ . '/../services/FacebookService.php';
require_once __DIR__ . '/../utils/crypto.php';

/**
 * Validates all accounts and updates their status
 * This endpoint should be called periodically (via cron or manually)
 */

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $db = new Database();
        $conn = $db->getConnection();

        // Get all accounts
        $stmt = $conn->query("SELECT * FROM accounts");
        $accounts = $stmt->fetchAll(PDO::FETCH_ASSOC);

        $results = [
            'checked' => 0,
            'active' => 0,
            'inactive' => 0,
            'details' => []
        ];

        foreach ($accounts as $account) {
            $accountId = $account['id'];
            $platform = $account['platform'];
            $platformId = $account['account_id'];
            $accessToken = decryptToken($account['access_token']);

            $results['checked']++;

            // Validate account based on platform
            $validationResult = validateAccount($platform, $platformId, $accessToken);

            // Update account status in database
            $updateStmt = $conn->prepare("
                UPDATE accounts 
                SET status = ?, 
                    inactive_reason = ?,
                    last_checked = NOW()
                WHERE id = ?
            ");

            $updateStmt->execute([
                $validationResult['status'],
                $validationResult['reason'],
                $accountId
            ]);

            if ($validationResult['status'] === 'active') {
                $results['active']++;
            } else {
                $results['inactive']++;
                
                // Create notification for inactive account
                createInactiveNotification($conn, $account, $validationResult['reason']);
            }

            $results['details'][] = [
                'account_id' => $accountId,
                'account_name' => $account['account_name'],
                'platform' => $platform,
                'status' => $validationResult['status'],
                'reason' => $validationResult['reason']
            ];
        }

        echo json_encode([
            'success' => true,
            'message' => 'Account validation completed',
            'results' => $results
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        error_log('Account validation error: ' . $e->getMessage());
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
    exit;
}

function validateAccount($platform, $platformId, $accessToken) {
    try {
        if ($platform === 'instagram') {
            $service = new InstagramService($accessToken);
            
            // Try to fetch basic account info
            $url = "https://graph.facebook.com/v18.0/{$platformId}";
            $params = [
                'fields' => 'id,username,followers_count',
                'access_token' => $accessToken
            ];

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200) {
                $data = json_decode($response, true);
                if (isset($data['id'])) {
                    return [
                        'status' => 'active',
                        'reason' => null
                    ];
                }
            }

            // Parse error
            $error = json_decode($response, true);
            $errorMessage = $error['error']['message'] ?? 'Unknown error';
            $errorCode = $error['error']['code'] ?? 0;

            // Determine specific reason
            if (strpos($errorMessage, 'expired') !== false || $errorCode === 190) {
                return [
                    'status' => 'inactive',
                    'reason' => 'Access token has expired. Please generate a new token from Graph API Explorer.'
                ];
            } elseif (strpos($errorMessage, 'permission') !== false || $errorCode === 10) {
                return [
                    'status' => 'inactive',
                    'reason' => 'Missing required permissions (pages_read_engagement, instagram_basic, instagram_manage_insights). Please regenerate token with correct permissions.'
                ];
            } elseif (strpos($errorMessage, 'does not exist') !== false || $errorCode === 803) {
                return [
                    'status' => 'inactive',
                    'reason' => 'Account ID is invalid or account has been deleted. Please verify the Instagram Business Account ID.'
                ];
            } elseif (strpos($errorMessage, 'rate limit') !== false || $errorCode === 4) {
                return [
                    'status' => 'active', // Temporary issue, keep active
                    'reason' => null
                ];
            } else {
                return [
                    'status' => 'inactive',
                    'reason' => 'API Error: ' . $errorMessage
                ];
            }

        } elseif ($platform === 'facebook') {
            $service = new FacebookService($accessToken);
            
            // Try to fetch basic page info
            $url = "https://graph.facebook.com/v18.0/{$platformId}";
            $params = [
                'fields' => 'id,name,fan_count',
                'access_token' => $accessToken
            ];

            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_TIMEOUT, 10);
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200) {
                $data = json_decode($response, true);
                if (isset($data['id'])) {
                    return [
                        'status' => 'active',
                        'reason' => null
                    ];
                }
            }

            // Parse error
            $error = json_decode($response, true);
            $errorMessage = $error['error']['message'] ?? 'Unknown error';
            $errorCode = $error['error']['code'] ?? 0;

            // Determine specific reason
            if (strpos($errorMessage, 'expired') !== false || $errorCode === 190) {
                return [
                    'status' => 'inactive',
                    'reason' => 'Access token has expired. Please generate a new page access token from Graph API Explorer.'
                ];
            } elseif (strpos($errorMessage, 'permission') !== false || $errorCode === 10) {
                return [
                    'status' => 'inactive',
                    'reason' => 'Missing required permissions (pages_read_engagement, read_insights). Please regenerate token with correct permissions.'
                ];
            } elseif (strpos($errorMessage, 'does not exist') !== false) {
                return [
                    'status' => 'inactive',
                    'reason' => 'Page ID is invalid or page has been deleted. Please verify the Facebook Page ID.'
                ];
            } else {
                return [
                    'status' => 'inactive',
                    'reason' => 'API Error: ' . $errorMessage
                ];
            }
        }

        return [
            'status' => 'inactive',
            'reason' => 'Platform not supported'
        ];

    } catch (Exception $e) {
        return [
            'status' => 'inactive',
            'reason' => 'Validation error: ' . $e->getMessage()
        ];
    }
}

function createInactiveNotification($conn, $account, $reason) {
    try {
        // Check if notification already exists for this account
        $checkStmt = $conn->prepare("
            SELECT id FROM notifications 
            WHERE account_id = ? 
            AND type = 'account_inactive' 
            AND is_read = 0
            ORDER BY created_at DESC 
            LIMIT 1
        ");
        $checkStmt->execute([$account['id']]);
        
        if ($checkStmt->rowCount() > 0) {
            // Notification already exists, don't create duplicate
            return;
        }

        // Create new notification
        $stmt = $conn->prepare("
            INSERT INTO notifications (account_id, type, title, message, created_at)
            VALUES (?, 'account_inactive', ?, ?, NOW())
        ");

        $title = "⚠️ {$account['account_name']} is Inactive";
        $message = "Reason: {$reason}. Please update the access token to reactivate.";

        $stmt->execute([$account['id'], $title, $message]);
    } catch (Exception $e) {
        error_log('Error creating inactive notification: ' . $e->getMessage());
    }
}

http_response_code(404);
echo json_encode(['success' => false, 'error' => 'Invalid request method']);
?>

