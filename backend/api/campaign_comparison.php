<?php
/**
 * Campaign Comparison API
 * Compare campaign performance across different time periods
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../services/FacebookAdsService.php';

// Handle OPTIONS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

// Get campaign comparison report
if ($method === 'POST') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $campaignId = $input['campaignId'] ?? '';
        $accessToken = $input['accessToken'] ?? '';
        $currentStart = $input['currentStart'] ?? '';
        $currentEnd = $input['currentEnd'] ?? '';
        $previousStart = $input['previousStart'] ?? '';
        $previousEnd = $input['previousEnd'] ?? '';
        
        if (empty($campaignId) || empty($accessToken)) {
            throw new Exception('Campaign ID and Access Token required');
        }
        
        if (empty($currentStart) || empty($currentEnd)) {
            throw new Exception('Current period dates required');
        }
        
        // Auto-calculate previous period if not provided
        if (empty($previousStart) || empty($previousEnd)) {
            $currentDays = (strtotime($currentEnd) - strtotime($currentStart)) / 86400;
            $previousEnd = date('Y-m-d', strtotime($currentStart . ' -1 day'));
            $previousStart = date('Y-m-d', strtotime($previousEnd . ' -' . $currentDays . ' days'));
        }
        
        $adsService = new FacebookAdsService($accessToken);
        
        // Fetch campaign data for both periods
        $currentPeriod = $adsService->getCampaignPeriodData($campaignId, $currentStart, $currentEnd);
        $previousPeriod = $adsService->getCampaignPeriodData($campaignId, $previousStart, $previousEnd);
        
        // Calculate changes
        $comparison = [
            'campaign_name' => $currentPeriod['name'] ?? 'Unknown',
            'current_period' => [
                'dates' => ['start' => $currentStart, 'end' => $currentEnd],
                'metrics' => $currentPeriod['metrics'] ?? []
            ],
            'previous_period' => [
                'dates' => ['start' => $previousStart, 'end' => $previousEnd],
                'metrics' => $previousPeriod['metrics'] ?? []
            ],
            'changes' => calculateChanges(
                $currentPeriod['metrics'] ?? [],
                $previousPeriod['metrics'] ?? []
            )
        ];
        
        echo json_encode([
            'success' => true,
            'data' => $comparison
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        error_log('Campaign comparison error: ' . $e->getMessage());
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
    exit;
}

function calculateChanges($current, $previous) {
    $changes = [];
    
    $metrics = ['spend', 'impressions', 'reach', 'clicks', 'ctr', 'cpc', 'cpm'];
    
    foreach ($metrics as $metric) {
        $currentValue = floatval($current[$metric] ?? 0);
        $previousValue = floatval($previous[$metric] ?? 0);
        
        $difference = $currentValue - $previousValue;
        $percentChange = $previousValue > 0 
            ? round((($currentValue - $previousValue) / $previousValue) * 100, 2)
            : ($currentValue > 0 ? 100 : 0);
        
        $changes[$metric] = [
            'current' => $currentValue,
            'previous' => $previousValue,
            'difference' => $difference,
            'percent_change' => $percentChange,
            'trend' => $difference > 0 ? 'up' : ($difference < 0 ? 'down' : 'stable')
        ];
    }
    
    return $changes;
}

http_response_code(404);
echo json_encode(['success' => false, 'error' => 'Endpoint not found']);
?>

