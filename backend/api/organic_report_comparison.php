<?php
/**
 * Organic Report Comparison API
 * Compares current period vs previous period (Weekly/Monthly/Quarterly)
 * Returns growth percentages and both periods' data
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../services/FacebookService.php';
require_once __DIR__ . '/../services/InstagramService.php';
require_once __DIR__ . '/../utils/crypto.php';
// Note: We'll fetch data via HTTP API calls to organic_report.php

// CORS Headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Access-Control-Max-Age: 3600");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

header('Content-Type: application/json');

/**
 * Calculate date range for a period type
 */
function calculatePeriodDates($periodType, $referenceDate = null) {
    if (!$referenceDate) {
        $referenceDate = date('Y-m-d');
    }
    $date = new DateTime($referenceDate);
    
    switch ($periodType) {
        case 'weekly':
            // Current week (last 7 days)
            $endDate = clone $date;
            $startDate = clone $date;
            $startDate->modify('-7 days');
            break;
        case 'monthly':
            // Current month
            $endDate = clone $date;
            $startDate = clone $date;
            $startDate->modify('first day of this month');
            break;
        case 'quarterly':
            // Current quarter
            $endDate = clone $date;
            $month = (int)$date->format('m');
            $quarter = floor(($month - 1) / 3);
            $startDate = clone $date;
            $startDate->modify('first day of January');
            $startDate->modify("+{$quarter} months");
            break;
        default:
            // Default to monthly
            $endDate = clone $date;
            $startDate = clone $date;
            $startDate->modify('first day of this month');
    }
    
    return [
        'start' => $startDate->format('Y-m-d'),
        'end' => $endDate->format('Y-m-d')
    ];
}

/**
 * Get previous period dates
 */
function getPreviousPeriodDates($periodType, $currentStart, $currentEnd) {
    $startDate = new DateTime($currentStart);
    $endDate = new DateTime($currentEnd);
    $diff = $startDate->diff($endDate);
    
    $prevEnd = clone $startDate;
    $prevEnd->modify('-1 day');
    $prevStart = clone $prevEnd;
    
    switch ($periodType) {
        case 'weekly':
            $prevStart->modify('-7 days');
            break;
        case 'monthly':
            $prevStart->modify('first day of last month');
            $prevEnd->modify('last day of last month');
            break;
        case 'quarterly':
            $prevStart->modify('-3 months');
            $prevStart->modify('first day of this month');
            $prevEnd = clone $prevStart;
            $prevEnd->modify('+2 months');
            $prevEnd->modify('last day of this month');
            break;
    }
    
    return [
        'start' => $prevStart->format('Y-m-d'),
        'end' => $prevEnd->format('Y-m-d')
    ];
}

/**
 * Calculate growth percentage
 */
function calculateGrowth($current, $previous) {
    if ($previous == 0) {
        return $current > 0 ? 100 : 0; // 100% growth if previous was 0 and current > 0
    }
    return round((($current - $previous) / $previous) * 100, 2);
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $accountId = $input['accountId'] ?? '';
        $periodType = $input['periodType'] ?? 'monthly'; // weekly, monthly, quarterly
        $customStartDate = $input['startDate'] ?? null;
        $customEndDate = $input['endDate'] ?? null;
        
        if (empty($accountId)) {
            throw new Exception('Account ID required');
        }
        
        // Calculate date ranges
        if ($customStartDate && $customEndDate) {
            $currentPeriod = [
                'start' => $customStartDate,
                'end' => $customEndDate
            ];
        } else {
            $currentPeriod = calculatePeriodDates($periodType);
        }
        
        $previousPeriod = getPreviousPeriodDates($periodType, $currentPeriod['start'], $currentPeriod['end']);
        
        // Get account info
        $db = new Database();
        $conn = $db->getConnection();
        
        $stmt = $conn->prepare("SELECT * FROM accounts WHERE id = ?");
        $stmt->execute([$accountId]);
        $account = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$account) {
            throw new Exception('Account not found');
        }
        
        // Fetch current and previous period data via HTTP API call
        // Use the organic_report.php endpoint we just created
        $accessToken = decryptToken($account['access_token']);
        $apiBaseUrl = 'http://localhost:8000/api';
        
        // Fetch current period
        $currentData = ['success' => false, 'data' => ['account_stats' => [], 'engagement' => []]];
        try {
            $ch = curl_init($apiBaseUrl . '/organic_report.php');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
                'accountId' => $accountId,
                'startDate' => $currentPeriod['start'],
                'endDate' => $currentPeriod['end'],
                'includePosts' => false, // Don't need posts for comparison
                'includeStories' => false
            ]));
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_setopt($ch, CURLOPT_TIMEOUT, 60);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($httpCode === 200) {
                $decoded = json_decode($response, true);
                if ($decoded && $decoded['success']) {
                    $currentData = $decoded;
                }
            }
        } catch (Exception $e) {
            error_log("Error fetching current period: " . $e->getMessage());
        }
        
        // Fetch previous period
        $previousData = ['success' => false, 'data' => ['account_stats' => [], 'engagement' => []]];
        try {
            $ch = curl_init($apiBaseUrl . '/organic_report.php');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
                'accountId' => $accountId,
                'startDate' => $previousPeriod['start'],
                'endDate' => $previousPeriod['end'],
                'includePosts' => false,
                'includeStories' => false
            ]));
            curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
            curl_setopt($ch, CURLOPT_TIMEOUT, 60);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);
            
            if ($httpCode === 200) {
                $decoded = json_decode($response, true);
                if ($decoded && $decoded['success']) {
                    $previousData = $decoded;
                }
            }
        } catch (Exception $e) {
            error_log("Error fetching previous period: " . $e->getMessage());
        }
        
        $current = $currentData['data'] ?? [];
        $previous = $previousData['data'] ?? [];
        
        // Calculate growth percentages
        $growth = [
            'followers' => calculateGrowth(
                $current['account_stats']['followers'] ?? 0,
                $previous['account_stats']['followers'] ?? 0
            ),
            'impressions' => calculateGrowth(
                $current['engagement']['impressions'] ?? 0,
                $previous['engagement']['impressions'] ?? 0
            ),
            'reach' => calculateGrowth(
                $current['engagement']['reach'] ?? 0,
                $previous['engagement']['reach'] ?? 0
            ),
            'engagement' => calculateGrowth(
                $current['engagement']['total_engagement'] ?? 0,
                $previous['engagement']['total_engagement'] ?? 0
            ),
            'likes' => calculateGrowth(
                $current['engagement']['likes'] ?? 0,
                $previous['engagement']['likes'] ?? 0
            ),
            'comments' => calculateGrowth(
                $current['engagement']['comments'] ?? 0,
                $previous['engagement']['comments'] ?? 0
            ),
            'posts_count' => calculateGrowth(
                $current['account_stats']['posts_count'] ?? 0,
                $previous['account_stats']['posts_count'] ?? 0
            ),
        ];
        
        echo json_encode([
            'success' => true,
            'data' => [
                'period_type' => $periodType,
                'current_period' => $currentPeriod,
                'previous_period' => $previousPeriod,
                'current' => $current,
                'previous' => $previous,
                'growth' => $growth
            ]
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        error_log("Error in organic_report_comparison.php: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
    exit;
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error' => 'GET method not supported. Use POST with accountId and periodType'
    ]);
    exit;
}

