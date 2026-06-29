<?php
/**
 * Campaign KPI Time Series API
 * Get daily breakdown of KPIs for chart visualization
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../services/FacebookAdsService.php';
require_once __DIR__ . '/../utils/crypto.php';

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

// Get KPI time series data
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
        $kpi = $input['kpi'] ?? 'spend'; // Default KPI
        
        if (empty($adAccountId) || empty($accessToken)) {
            http_response_code(400);
            echo json_encode([
                'success' => false,
                'error' => 'Ad Account ID and Access Token are required'
            ]);
            exit;
        }
        
        $adsService = new FacebookAdsService($accessToken);
        
        // Ensure adAccountId has the correct format (remove act_ prefix if present, then add it)
        $cleanAdAccountId = str_replace('act_', '', $adAccountId);
        
        // Get account-level insights with daily breakdown
        $url = "https://graph.facebook.com/v18.0/act_{$cleanAdAccountId}/insights";
        
        // Map KPI to Facebook API metric
        $metricMap = [
            'spend' => 'spend',
            'impressions' => 'impressions',
            'reach' => 'reach',
            'clicks' => 'clicks',
            'ctr' => 'ctr',
            'cpc' => 'cpc',
            'cpm' => 'cpm',
            'leads' => 'actions', // Leads come from actions
            'cost_per_lead' => 'cost_per_action_type'
        ];
        
        $metric = $metricMap[$kpi] ?? 'spend';
        
        // Build fields based on KPI
        $fields = ['date_start', 'date_stop'];
        if ($kpi === 'leads') {
            $fields[] = 'actions';
        } elseif ($kpi === 'cost_per_lead') {
            $fields[] = 'actions';
            $fields[] = 'spend';
        } else {
            $fields[] = $metric;
        }
        
        // Build params - Facebook API expects time_range as JSON string
        $timeRange = [
            'since' => $startDate,
            'until' => $endDate
        ];
        
        $params = [
            'fields' => implode(',', $fields),
            'time_range' => json_encode($timeRange),
            'time_increment' => 1, // Daily breakdown
            'access_token' => $accessToken
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200) {
            $errorData = json_decode($response, true);
            throw new Exception($errorData['error']['message'] ?? 'Failed to fetch KPI data');
        }
        
        $data = json_decode($response, true);
        
        error_log("Facebook API Response for KPI $kpi: " . json_encode($data));
        
        if (!isset($data['data']) || empty($data['data'])) {
            error_log("No data returned from Facebook API for KPI: $kpi");
            echo json_encode([
                'success' => true,
                'data' => [],
                'kpi' => $kpi
            ]);
            exit;
        }
        
        error_log("Processing " . count($data['data']) . " data points for KPI: $kpi");
        
        // Process data for chart
        $chartData = [];
        foreach ($data['data'] as $day) {
            $date = $day['date_start'] ?? $day['date_stop'] ?? '';
            $value = 0;
            
            if ($kpi === 'leads') {
                // Extract leads from actions
                if (!empty($day['actions'])) {
                    foreach ($day['actions'] as $action) {
                        if ($action['action_type'] === 'lead' || $action['action_type'] === 'onsite_conversion.lead_grouped') {
                            $value += intval($action['value'] ?? 0);
                        }
                    }
                }
            } elseif ($kpi === 'cost_per_lead') {
                // Calculate cost per lead
                $spend = floatval($day['spend'] ?? 0);
                $leads = 0;
                if (!empty($day['actions'])) {
                    foreach ($day['actions'] as $action) {
                        if ($action['action_type'] === 'lead' || $action['action_type'] === 'onsite_conversion.lead_grouped') {
                            $leads += intval($action['value'] ?? 0);
                        }
                    }
                }
                $value = $leads > 0 ? ($spend / $leads) : 0;
            } else {
                $value = floatval($day[$metric] ?? 0);
            }
            
            $chartData[] = [
                'date' => $date,
                'value' => $value,
                'formattedDate' => date('M d', strtotime($date))
            ];
        }
        
        error_log("Processed " . count($chartData) . " chart data points");
        
        echo json_encode([
            'success' => true,
            'data' => $chartData,
            'kpi' => $kpi,
            'date_range' => [
                'start' => $startDate,
                'end' => $endDate
            ]
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        error_log('Campaign KPI error: ' . $e->getMessage());
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

