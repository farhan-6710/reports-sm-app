<?php
/**
 * Meta Insights Service
 * Handles Facebook Page & Instagram insights with deprecation awareness
 */

require_once __DIR__ . '/MetricMapper.php';

class MetaInsightsService {
    private $accessToken;
    private $apiVersion = 'v21.0'; // Latest version
    private $db;
    
    public function __construct($accessToken, $db = null) {
        $this->accessToken = $accessToken;
        $this->db = $db;
    }
    
    /**
     * Fetch Instagram daily insights
     * @param string $igUserId Instagram Business Account ID
     * @param string $since Start date (YYYY-MM-DD)
     * @param string $until End date (YYYY-MM-DD)
     * @return array Insights data
     */
    public function fetchIgDailyInsights($igUserId, $since, $until) {
        // Supported metrics as of 2024/2025
        // NOTE: 'impressions' is NOT available for account-level insights in v19.0+
        // Some metrics require metric_type=total_value parameter
        
        // Simple metrics (no metric_type needed)
        $simpleMetrics = [
            'reach',
            'website_clicks',
            'follower_count',
            'views'
        ];
        
        // Metrics requiring metric_type=total_value
        $totalValueMetrics = [
            'profile_views',
            'accounts_engaged',
            'total_interactions'
        ];
        
        $sinceUnix = strtotime($since);
        $untilUnix = strtotime($until);
        
        $url = "https://graph.facebook.com/{$this->apiVersion}/{$igUserId}/insights";
        
        $allData = [];
        
        // Fetch simple metrics
        if (!empty($simpleMetrics)) {
            $params = [
                'metric' => implode(',', $simpleMetrics),
                'period' => 'day',
                'since' => $sinceUnix,
                'until' => $untilUnix,
                'access_token' => $this->accessToken
            ];
            
            try {
                $response = $this->makeRequest($url, $params);
                if (isset($response['data'])) {
                    $allData = array_merge($allData, $response['data']);
                }
            } catch (Exception $e) {
                error_log("Simple metrics fetch failed: " . $e->getMessage());
            }
        }
        
        // Fetch total_value metrics
        foreach ($totalValueMetrics as $metric) {
            $params = [
                'metric' => $metric,
                'metric_type' => 'total_value',
                'period' => 'day',
                'since' => $sinceUnix,
                'until' => $untilUnix,
                'access_token' => $this->accessToken
            ];
            
            try {
                $response = $this->makeRequest($url, $params);
                if (isset($response['data'])) {
                    $allData = array_merge($allData, $response['data']);
                }
            } catch (Exception $e) {
                error_log("Metric '$metric' fetch failed: " . $e->getMessage());
            }
        }
        
        // Create response structure
        $response = ['data' => $allData];
        
        return $this->normalizeInsights($response, 'meta_instagram');
    }
    
    /**
     * Fetch Facebook Page insights
     * @param string $pageId Facebook Page ID
     * @param string $since Start date (YYYY-MM-DD)
     * @param string $until End date (YYYY-MM-DD)
     * @return array Insights data
     */
    public function fetchPageDailyInsights($pageId, $since, $until) {
        // Metrics NOT deprecated as of Nov 2025
        $metrics = [
            'page_impressions',
            'page_impressions_unique',
            'page_post_engagements',
            'page_engaged_users',
            'page_views_total',
            'page_video_views'
        ];
        
        $sinceUnix = strtotime($since);
        $untilUnix = strtotime($until);
        
        $url = "https://graph.facebook.com/{$this->apiVersion}/{$pageId}/insights";
        $params = [
            'metric' => implode(',', $metrics),
            'period' => 'day',
            'since' => $sinceUnix,
            'until' => $untilUnix,
            'access_token' => $this->accessToken
        ];
        
        $response = $this->makeRequest($url, $params);
        
        return $this->normalizeInsights($response, 'meta_facebook');
    }
    
    /**
     * Get Instagram media (posts) with insights
     * @param string $igUserId Instagram Business Account ID
     * @param int $limit Number of media to fetch
     * @return array Media data with insights
     */
    public function fetchIgMedia($igUserId, $limit = 25) {
        $url = "https://graph.facebook.com/{$this->apiVersion}/{$igUserId}/media";
        // Use 'views' instead of deprecated 'impressions', and 'total_interactions' instead of 'engagement'
        $params = [
            'fields' => 'id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,like_count,comments_count,insights.metric(views,reach,total_interactions,saved)',
            'limit' => $limit,
            'access_token' => $this->accessToken
        ];
        
        $response = $this->makeRequest($url, $params);
        
        return $response['data'] ?? [];
    }
    
    /**
     * Get Facebook Page basic info
     * @param string $pageId Facebook Page ID
     * @return array Page data
     */
    public function getPageInfo($pageId) {
        $url = "https://graph.facebook.com/{$this->apiVersion}/{$pageId}";
        $params = [
            'fields' => 'name,followers_count,about,category,instagram_business_account',
            'access_token' => $this->accessToken
        ];
        
        return $this->makeRequest($url, $params);
    }
    
    /**
     * Get Instagram user info
     * @param string $igUserId Instagram Business Account ID
     * @return array User data
     */
    public function getIgUserInfo($igUserId) {
        $url = "https://graph.facebook.com/{$this->apiVersion}/{$igUserId}";
        $params = [
            'fields' => 'username,name,profile_picture_url,followers_count,media_count',
            'access_token' => $this->accessToken
        ];
        
        return $this->makeRequest($url, $params);
    }
    
    /**
     * Make HTTP request to Graph API
     * @param string $url API URL
     * @param array $params Query parameters
     * @return array Response data
     */
    private function makeRequest($url, $params = []) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        $data = json_decode($response, true);
        
        if ($httpCode !== 200 || isset($data['error'])) {
            $errorMsg = $data['error']['message'] ?? 'Unknown API error';
            error_log("Meta API Error: $errorMsg");
            throw new Exception("Facebook API Error: $errorMsg");
        }
        
        return $data;
    }
    
    /**
     * Normalize insights to canonical format
     * @param array $rawInsights Raw API response
     * @param string $provider Provider identifier
     * @return array Normalized insights
     */
    private function normalizeInsights($rawInsights, $provider) {
        $normalized = [];
        
        foreach ($rawInsights['data'] ?? [] as $insight) {
            $providerKey = $insight['name'] ?? '';
            $canonicalKey = MetricMapper::mapToCanonical($provider, $providerKey);
            
            // Check if deprecated
            if ($this->db) {
                $deprecation = MetricMapper::checkDeprecation('meta', $providerKey, $this->db);
                if ($deprecation) {
                    error_log("Warning: Using deprecated metric '$providerKey'. " . $deprecation['notes']);
                }
            }
            
            $normalized[$canonicalKey] = [
                'values' => $insight['values'] ?? [],
                'title' => $insight['title'] ?? $canonicalKey,
                'description' => $insight['description'] ?? '',
                'original_key' => $providerKey
            ];
        }
        
        return $normalized;
    }
    
    /**
     * Batch request for multiple metrics efficiently
     * @param array $requests Array of request configs
     * @return array Batch results
     */
    public function batchRequest($requests) {
        $batch = [];
        
        foreach ($requests as $request) {
            $batch[] = [
                'method' => 'GET',
                'relative_url' => $request['endpoint'] . '?' . http_build_query($request['params'] ?? [])
            ];
        }
        
        $url = "https://graph.facebook.com/{$this->apiVersion}/";
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
            'batch' => json_encode($batch),
            'access_token' => $this->accessToken
        ]));
        
        $response = curl_exec($ch);
        curl_close($ch);
        
        $results = json_decode($response, true);
        
        return array_map(function($result) {
            return json_decode($result['body'] ?? '{}', true);
        }, $results);
    }
}
?>

