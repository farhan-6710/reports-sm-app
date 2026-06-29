<?php
/**
 * Follower Growth API
 * Returns month-on-month follower growth data
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../services/FollowerTracker.php';

// Handle OPTIONS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'POST') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $accountId = $input['accountId'] ?? null;
        $month = $input['month'] ?? null; // Format: '2025-11'
        $startDate = $input['startDate'] ?? null;
        $endDate = $input['endDate'] ?? null;
        
        if (empty($accountId)) {
            throw new Exception('Account ID is required');
        }
        
        $tracker = new FollowerTracker();
        
        // If month is provided, get monthly growth
        if ($month) {
            $growthData = $tracker->getMonthlyGrowth($accountId, $month);
        } 
        // If date range is provided, get growth for that range
        elseif ($startDate && $endDate) {
            $growthData = $tracker->getFollowerGrowth($accountId, $startDate, $endDate);
        }
        // Default: get current month growth
        else {
            $growthData = $tracker->getMonthlyGrowth($accountId);
        }
        
        echo json_encode([
            'success' => true,
            'data' => $growthData
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        error_log('Error in follower_growth.php: ' . $e->getMessage());
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
    exit;
}

http_response_code(404);
echo json_encode(['success' => false, 'error' => 'Endpoint not found']);












