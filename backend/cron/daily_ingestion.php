<?php
/**
 * Daily Ingestion Cron Job
 * Runs daily to pull metrics from all connected accounts
 * Usage: php daily_ingestion.php
 * Crontab: 0 2 * * * /usr/bin/php /path/to/daily_ingestion.php
 */

require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../services/MetaInsightsService.php';
require_once __DIR__ . '/../services/YouTubeAnalyticsService.php';

class DailyIngestion {
    private $db;
    
    public function __construct() {
        $database = new Database();
        $this->db = $database->getConnection();
    }
    
    /**
     * Run ingestion for all active accounts
     */
    public function run() {
        echo "[" . date('Y-m-d H:i:s') . "] Starting daily ingestion...\n";
        
        // Fetch T-1 (yesterday) and last 7 days to catch late-arriving data
        $yesterday = date('Y-m-d', strtotime('-1 day'));
        $sevenDaysAgo = date('Y-m-d', strtotime('-7 days'));
        
        // Get all active accounts
        $stmt = $this->db->query("SELECT * FROM accounts WHERE is_active = 1");
        $accounts = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo "Found " . count($accounts) . " active accounts\n";
        
        foreach ($accounts as $account) {
            $this->ingestAccount($account, $sevenDaysAgo, $yesterday);
        }
        
        echo "[" . date('Y-m-d H:i:s') . "] Daily ingestion completed!\n";
    }
    
    /**
     * Ingest data for single account
     * @param array $account Account data
     * @param string $startDate Start date
     * @param string $endDate End date
     */
    private function ingestAccount($account, $startDate, $endDate) {
        echo "\nProcessing: {$account['name']} ({$account['platform']})\n";
        
        // Create ingestion job record
        $jobId = $this->createJob($account['id'], 'daily', $startDate, $endDate);
        
        try {
            // Get token for this account
            $token = $this->getAccountToken($account['id']);
            
            if (!$token) {
                throw new Exception("No valid token found for account {$account['id']}");
            }
            
            // Ingest based on platform
            switch ($account['platform']) {
                case 'facebook':
                    $this->ingestFacebook($account, $token, $startDate, $endDate);
                    break;
                    
                case 'instagram':
                    $this->ingestInstagram($account, $token, $startDate, $endDate);
                    break;
                    
                case 'youtube':
                    $this->ingestYouTube($account, $token, $startDate, $endDate);
                    break;
                    
                default:
                    echo "  Skipping unsupported platform: {$account['platform']}\n";
            }
            
            $this->completeJob($jobId, 'completed');
            echo "  ✓ Success\n";
            
        } catch (Exception $e) {
            $this->completeJob($jobId, 'failed', $e->getMessage());
            echo "  ✗ Error: " . $e->getMessage() . "\n";
        }
    }
    
    /**
     * Ingest Facebook Page data
     */
    private function ingestFacebook($account, $token, $startDate, $endDate) {
        $service = new MetaInsightsService($token, $this->db);
        
        // Get page info
        $pageInfo = $service->getPageInfo($account['external_id']);
        
        // Update follower count
        $this->saveMetric($account['id'], date('Y-m-d'), 'followers', $pageInfo['followers_count'] ?? 0);
        
        // Get daily insights
        $insights = $service->fetchPageDailyInsights($account['external_id'], $startDate, $endDate);
        
        // Save each metric
        foreach ($insights as $canonicalKey => $data) {
            foreach ($data['values'] ?? [] as $value) {
                $date = date('Y-m-d', $value['end_time'] ?? time());
                $this->saveMetric($account['id'], $date, $canonicalKey, $value['value'] ?? 0);
            }
        }
    }
    
    /**
     * Ingest Instagram data
     */
    private function ingestInstagram($account, $token, $startDate, $endDate) {
        $service = new MetaInsightsService($token, $this->db);
        
        // Get user info
        $userInfo = $service->getIgUserInfo($account['external_id']);
        
        // Update follower count
        $this->saveMetric($account['id'], date('Y-m-d'), 'followers', $userInfo['followers_count'] ?? 0);
        
        // Get daily insights
        $insights = $service->fetchIgDailyInsights($account['external_id'], $startDate, $endDate);
        
        // Save each metric
        foreach ($insights as $canonicalKey => $data) {
            foreach ($data['values'] ?? [] as $value) {
                $date = date('Y-m-d', $value['end_time'] ?? time());
                $this->saveMetric($account['id'], $date, $canonicalKey, $value['value'] ?? 0);
            }
        }
        
        // Get recent media
        $media = $service->fetchIgMedia($account['external_id'], 25);
        foreach ($media as $item) {
            $this->saveContent($account['id'], $item);
        }
    }
    
    /**
     * Ingest YouTube data
     */
    private function ingestYouTube($account, $token, $startDate, $endDate) {
        $service = new YouTubeAnalyticsService($token);
        
        $analytics = $service->fetchChannelAnalytics($account['external_id'], $startDate, $endDate);
        
        // Process rows (day-by-day data)
        foreach ($analytics['rows'] ?? [] as $row) {
            $date = $row[0]; // First column is the date
            $metricValues = array_slice($row, 1); // Rest are metric values
            
            // Map to metric keys
            foreach ($analytics['columnHeaders'] ?? [] as $index => $header) {
                if ($index === 0) continue; // Skip date column
                
                $metricKey = $header['name'] ?? '';
                $canonicalKey = MetricMapper::mapToCanonical('youtube', $metricKey);
                $value = $metricValues[$index - 1] ?? 0;
                
                $this->saveMetric($account['id'], $date, $canonicalKey, $value);
            }
        }
    }
    
    /**
     * Save metric to database (upsert)
     */
    private function saveMetric($accountId, $date, $metricKey, $value, $breakdown = null) {
        $stmt = $this->db->prepare("
            INSERT INTO metrics_daily (date, account_id, metric_key, metric_value, breakdown_json, data_source)
            VALUES (?, ?, ?, ?, ?, 'api')
            ON DUPLICATE KEY UPDATE
                metric_value = VALUES(metric_value),
                breakdown_json = VALUES(breakdown_json),
                updated_at = NOW()
        ");
        
        $stmt->execute([
            $date,
            $accountId,
            $metricKey,
            $value,
            $breakdown ? json_encode($breakdown) : null
        ]);
    }
    
    /**
     * Save content to database
     */
    private function saveContent($accountId, $contentData) {
        $stmt = $this->db->prepare("
            INSERT INTO content (account_id, platform_post_id, content_type, published_at, title, description, media_url, permalink, metadata)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                title = VALUES(title),
                description = VALUES(description),
                updated_at = NOW()
        ");
        
        $stmt->execute([
            $accountId,
            $contentData['id'] ?? '',
            $contentData['media_type'] ?? 'post',
            $contentData['timestamp'] ?? date('Y-m-d H:i:s'),
            $contentData['caption'] ?? '',
            $contentData['caption'] ?? '',
            $contentData['media_url'] ?? '',
            $contentData['permalink'] ?? '',
            json_encode($contentData)
        ]);
        
        $contentId = $this->db->lastInsertId();
        
        // Save content metrics
        if (isset($contentData['like_count'])) {
            $this->saveContentMetric($contentId, date('Y-m-d'), 'likes', $contentData['like_count']);
        }
        if (isset($contentData['comments_count'])) {
            $this->saveContentMetric($contentId, date('Y-m-d'), 'comments', $contentData['comments_count']);
        }
    }
    
    /**
     * Save content-level metric
     */
    private function saveContentMetric($contentId, $date, $metricKey, $value) {
        $stmt = $this->db->prepare("
            INSERT INTO content_metrics_daily (date, content_id, metric_key, metric_value)
            VALUES (?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
                metric_value = VALUES(metric_value),
                updated_at = NOW()
        ");
        
        $stmt->execute([$date, $contentId, $metricKey, $value]);
    }
    
    /**
     * Get account token
     */
    private function getAccountToken($accountId) {
        $stmt = $this->db->prepare("
            SELECT access_token FROM tokens 
            WHERE account_id = ? AND is_active = 1 
            ORDER BY expires_at DESC 
            LIMIT 1
        ");
        $stmt->execute([$accountId]);
        $result = $stmt->fetch(PDO::FETCH_ASSOC);
        
        return $result['access_token'] ?? null;
    }
    
    /**
     * Create ingestion job
     */
    private function createJob($accountId, $jobType, $startDate, $endDate) {
        $stmt = $this->db->prepare("
            INSERT INTO ingestion_jobs (account_id, job_type, start_date, end_date, status, started_at)
            VALUES (?, ?, ?, ?, 'running', NOW())
        ");
        $stmt->execute([$accountId, $jobType, $startDate, $endDate]);
        
        return $this->db->lastInsertId();
    }
    
    /**
     * Complete ingestion job
     */
    private function completeJob($jobId, $status, $errorMessage = null) {
        $stmt = $this->db->prepare("
            UPDATE ingestion_jobs 
            SET status = ?, error_message = ?, completed_at = NOW()
            WHERE id = ?
        ");
        $stmt->execute([$status, $errorMessage, $jobId]);
    }
}

// Run if called directly
if (php_sapi_name() === 'cli' && basename(__FILE__) === basename($_SERVER['PHP_SELF'] ?? '')) {
    $ingestion = new DailyIngestion();
    $ingestion->run();
}
?>

