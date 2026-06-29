<?php
/**
 * Notifications API
 * Track new accounts, report generation, and system events
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';

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

// Get notifications
if ($method === 'GET') {
    try {
        $db = new Database();
        $conn = $db->getConnection();
        
        $limit = intval($_GET['limit'] ?? 10);
        $limit = max(1, min(100, $limit)); // Clamp between 1 and 100
        $unreadOnly = isset($_GET['unread']) && $_GET['unread'] === 'true';
        
        // Check if notifications table exists
        try {
            $tableCheck = $conn->query("SHOW TABLES LIKE 'notifications'")->fetch();
            if (!$tableCheck) {
                // Table doesn't exist, return empty array
                echo json_encode([
                    'success' => true,
                    'data' => [],
                    'unread_count' => 0
                ]);
                exit;
            }
        } catch (Exception $e) {
            // If we can't check the table, assume it doesn't exist
            echo json_encode([
                'success' => true,
                'data' => [],
                'unread_count' => 0
            ]);
            exit;
        }
        
        $query = "SELECT * FROM notifications";
        if ($unreadOnly) {
            $query .= " WHERE is_read = 0";
        }
        $query .= " ORDER BY created_at DESC LIMIT " . intval($limit);
        
        $stmt = $conn->prepare($query);
        $stmt->execute();
        $notifications = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Get unread count
        $unreadStmt = $conn->query("SELECT COUNT(*) as count FROM notifications WHERE is_read = 0");
        $unreadResult = $unreadStmt->fetch(PDO::FETCH_ASSOC);
        $unreadCount = $unreadResult['count'] ?? 0;
        
        echo json_encode([
            'success' => true,
            'data' => $notifications,
            'unread_count' => intval($unreadCount)
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        error_log('Notifications API error: ' . $e->getMessage());
        echo json_encode([
            'success' => false,
            'error' => 'Failed to fetch notifications: ' . $e->getMessage()
        ]);
    }
    exit;
}

// Mark as read
if ($method === 'PUT') {
    try {
        $notificationId = $_GET['id'] ?? '';
        
        if (empty($notificationId)) {
            throw new Exception('Notification ID required');
        }
        
        $db = new Database();
        $conn = $db->getConnection();
        
        $stmt = $conn->prepare("UPDATE notifications SET is_read = 1 WHERE id = ?");
        $stmt->execute([$notificationId]);
        
        echo json_encode([
            'success' => true,
            'message' => 'Notification marked as read'
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

http_response_code(404);
echo json_encode(['success' => false, 'error' => 'Endpoint not found']);
?>

