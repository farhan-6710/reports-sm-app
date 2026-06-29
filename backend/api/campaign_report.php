<?php
/**
 * Campaign Report API
 * Get campaign, ad set, and ad level data
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../services/FacebookAdsService.php';

// Handle OPTIONS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    header("Access-Control-Allow-Origin: *");
    header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
    header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
    exit;
}

header('Content-Type: application/json');
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

$method = $_SERVER['REQUEST_METHOD'];

// Get campaign report
if ($method === 'POST') {
    try {
        $rawInput = file_get_contents('php://input');
        $input = json_decode($rawInput, true);
        
        // Check for JSON parsing errors
        if (json_last_error() !== JSON_ERROR_NONE) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Invalid JSON in request body: ' . json_last_error_msg()
            ]);
            exit;
        }
        
        $adAccountId = $input['adAccountId'] ?? '';
        $accessToken = $input['accessToken'] ?? '';
        $startDate = $input['startDate'] ?? date('Y-m-d', strtotime('-30 days'));
        $endDate = $input['endDate'] ?? date('Y-m-d');
        $accountDbId = $input['accountDbId'] ?? null; // Database ID of the ad account
        
        if (empty($adAccountId) || empty($accessToken)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Ad Account ID and Access Token are required'
            ]);
            exit;
        }
        
        try {
            $adsService = new FacebookAdsService($accessToken);
            $report = $adsService->getCampaignReport($adAccountId, $startDate, $endDate);
            
            if (!$report['success']) {
                throw new Exception($report['error'] ?? 'Failed to generate campaign report');
            }
            
            // Mark ad account as active if successful and we have the DB ID
            if ($accountDbId) {
                $db = new Database();
                $conn = $db->getConnection();
                $updateStmt = $conn->prepare("UPDATE ad_accounts SET status = 'active', inactive_reason = NULL, last_checked = NOW() WHERE id = ?");
                $updateStmt->execute([$accountDbId]);
            }
            
            echo json_encode([
                'success' => true,
                'data' => $report['data']
            ]);
            
        } catch (Exception $apiError) {
            // Mark ad account as inactive and store the reason
            if ($accountDbId) {
                $db = new Database();
                $conn = $db->getConnection();
                
                $errorMessage = $apiError->getMessage();
                $inactiveReason = determineInactiveReason($errorMessage);
                
                $updateStmt = $conn->prepare("UPDATE ad_accounts SET status = 'inactive', inactive_reason = ?, last_checked = NOW() WHERE id = ?");
                $updateStmt->execute([$inactiveReason, $accountDbId]);
                
                // Get account details for notification
                $accountStmt = $conn->prepare("SELECT * FROM ad_accounts WHERE id = ?");
                $accountStmt->execute([$accountDbId]);
                $account = $accountStmt->fetch(PDO::FETCH_ASSOC);
                
                if ($account) {
                    createInactiveNotification($conn, $account, $inactiveReason);
                }
            }
            
            throw $apiError;
        }
        
    } catch (Exception $e) {
        http_response_code(500);
        error_log('Campaign report error: ' . $e->getMessage());
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
    exit;
}

function determineInactiveReason($errorMessage) {
    // Parse error message and return user-friendly reason
    
    if (stripos($errorMessage, 'expired') !== false || stripos($errorMessage, 'Session has expired') !== false) {
        return 'Access token has expired. Please generate a new ads token from Graph API Explorer with ads_read and ads_management permissions.';
    }
    
    if (stripos($errorMessage, 'permission') !== false || stripos($errorMessage, 'OAuthException') !== false) {
        return 'Missing required permissions. Please regenerate token with ads_read and ads_management permissions.';
    }
    
    if (stripos($errorMessage, 'does not exist') !== false || stripos($errorMessage, 'Unknown') !== false) {
        return 'Ad Account ID is invalid or you don\'t have access. Please verify the Ad Account ID (format: act_123456789).';
    }
    
    if (stripos($errorMessage, 'rate limit') !== false) {
        return 'API rate limit exceeded. Please try again in a few minutes. This is temporary.';
    }
    
    if (stripos($errorMessage, 'Invalid OAuth') !== false) {
        return 'Invalid access token format. Please generate a valid Ads Access Token from Graph API Explorer.';
    }
    
    // Generic error
    return 'API Error: ' . substr($errorMessage, 0, 200);
}

function createInactiveNotification($conn, $account, $reason) {
    try {
        // Check if notification already exists for this account
        $checkStmt = $conn->prepare("
            SELECT id FROM notifications 
            WHERE message LIKE ? 
            AND type = 'account_inactive' 
            AND is_read = 0
            ORDER BY created_at DESC 
            LIMIT 1
        ");
        $checkStmt->execute(['%' . $account['client_name'] . '%']);
        
        if ($checkStmt->rowCount() > 0) {
            // Notification already exists, don't create duplicate
            return;
        }

        // Create new notification
        $stmt = $conn->prepare("
            INSERT INTO notifications (type, title, message, created_at)
            VALUES ('account_inactive', ?, ?, NOW())
        ");

        $title = "⚠️ {$account['client_name']} Ad Account is Inactive";
        $message = "Reason: {$reason}";

        $stmt->execute([$title, $message]);
    } catch (Exception $e) {
        error_log('Error creating inactive notification: ' . $e->getMessage());
    }
}

http_response_code(404);
echo json_encode(['success' => false, 'error' => 'Endpoint not found']);
?>

