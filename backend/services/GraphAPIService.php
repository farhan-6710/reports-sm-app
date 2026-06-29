<?php
/**
 * Graph API Service
 * Minimal cURL examples for Page/IG/Ads insights
 */

class GraphAPIService {
    private $accessToken;
    private $apiVersion = 'v19.0';
    
    public function __construct($accessToken) {
        $this->accessToken = $accessToken;
    }
    
    /**
     * Make Graph API request
     * @param string $endpoint API endpoint
     * @param array $params Query parameters
     * @param string $method HTTP method
     * @return array Response data
     */
    private function makeRequest($endpoint, $params = [], $method = 'GET') {
        $params['access_token'] = $this->accessToken;
        
        $url = "https://graph.facebook.com/{$this->apiVersion}/{$endpoint}";
        
        if ($method === 'GET') {
            $url .= '?' . http_build_query($params);
        }
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        
        if ($method !== 'GET') {
            curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($params));
        }
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        $data = json_decode($response, true);
        
        if ($httpCode !== 200 || isset($data['error'])) {
            throw new Exception($data['error']['message'] ?? 'API request failed');
        }
        
        return $data;
    }
    
    /**
     * Get Facebook Page Insights (Organic)
     * @param string $pageId Page ID
     * @param array $metrics Metrics to fetch
     * @param string $period Time period (day, week, days_28)
     * @param int $since Unix timestamp
     * @param int $until Unix timestamp
     * @return array Insights data
     */
    public function getPageInsights($pageId, $metrics, $period = 'day', $since = null, $until = null) {
        $params = [
            'metric' => implode(',', $metrics),
            'period' => $period,
        ];
        
        if ($since) {
            $params['since'] = $since;
        }
        
        if ($until) {
            $params['until'] = $until;
        }
        
        return $this->makeRequest("{$pageId}/insights", $params);
    }
    
    /**
     * Get Page basic info
     * @param string $pageId Page ID
     * @return array Page data
     */
    public function getPageInfo($pageId) {
        $fields = [
            'name',
            'fan_count',
            'followers_count',
            'about',
            'category',
            'instagram_business_account'
        ];
        
        return $this->makeRequest($pageId, [
            'fields' => implode(',', $fields)
        ]);
    }
    
    /**
     * Get Instagram User Insights (Organic)
     * @param string $igUserId Instagram Business Account ID
     * @param array $metrics Metrics to fetch
     * @param string $period Time period (day, week, days_28, lifetime)
     * @param int $since Unix timestamp
     * @param int $until Unix timestamp
     * @return array Insights data
     */
    public function getInstagramInsights($igUserId, $metrics, $period = 'day', $since = null, $until = null) {
        $params = [
            'metric' => implode(',', $metrics),
            'period' => $period,
        ];
        
        if ($since) {
            $params['since'] = $since;
        }
        
        if ($until) {
            $params['until'] = $until;
        }
        
        return $this->makeRequest("{$igUserId}/insights", $params);
    }
    
    /**
     * Get Instagram User Info
     * @param string $igUserId Instagram Business Account ID
     * @return array User data
     */
    public function getInstagramUserInfo($igUserId) {
        $fields = [
            'username',
            'name',
            'profile_picture_url',
            'followers_count',
            'media_count'
        ];
        
        return $this->makeRequest($igUserId, [
            'fields' => implode(',', $fields)
        ]);
    }
    
    /**
     * Get Instagram Media (Posts)
     * @param string $igUserId Instagram Business Account ID
     * @param int $limit Number of media to fetch
     * @return array Media data
     */
    public function getInstagramMedia($igUserId, $limit = 25) {
        $fields = [
            'id',
            'caption',
            'media_type',
            'media_url',
            'permalink',
            'thumbnail_url',
            'timestamp',
            'like_count',
            'comments_count'
        ];
        
        return $this->makeRequest("{$igUserId}/media", [
            'fields' => implode(',', $fields),
            'limit' => $limit
        ]);
    }
    
    /**
     * Get Ad Account Insights (Paid/Inorganic)
     * @param string $adAccountId Ad Account ID (format: act_123456789)
     * @param string $datePreset Date preset (today, yesterday, last_7d, last_30d, etc.)
     * @param array $fields Fields to fetch
     * @param array $breakdowns Breakdowns (age, gender, publisher_platform, etc.)
     * @return array Insights data
     */
    public function getAdAccountInsights($adAccountId, $datePreset = 'last_30d', $fields = [], $breakdowns = []) {
        $defaultFields = [
            'impressions',
            'reach',
            'clicks',
            'spend',
            'cpc',
            'cpm',
            'ctr',
            'actions',
            'conversions',
            'cost_per_action_type'
        ];
        
        $fields = empty($fields) ? $defaultFields : $fields;
        
        $params = [
            'date_preset' => $datePreset,
            'fields' => implode(',', $fields),
            'level' => 'account'
        ];
        
        if (!empty($breakdowns)) {
            $params['breakdowns'] = implode(',', $breakdowns);
        }
        
        return $this->makeRequest("{$adAccountId}/insights", $params);
    }
    
    /**
     * Get Campaign Insights (Paid/Inorganic)
     * @param string $campaignId Campaign ID
     * @param string $datePreset Date preset
     * @param array $fields Fields to fetch
     * @return array Insights data
     */
    public function getCampaignInsights($campaignId, $datePreset = 'last_30d', $fields = []) {
        $defaultFields = [
            'campaign_name',
            'impressions',
            'reach',
            'clicks',
            'spend',
            'cpc',
            'cpm',
            'ctr',
            'actions',
            'conversions'
        ];
        
        $fields = empty($fields) ? $defaultFields : $fields;
        
        return $this->makeRequest("{$campaignId}/insights", [
            'date_preset' => $datePreset,
            'fields' => implode(',', $fields)
        ]);
    }
    
    /**
     * Get Ad Sets for Account
     * @param string $adAccountId Ad Account ID
     * @param int $limit Number of ad sets to fetch
     * @return array Ad sets data
     */
    public function getAdSets($adAccountId, $limit = 25) {
        return $this->makeRequest("{$adAccountId}/adsets", [
            'fields' => 'id,name,status,daily_budget,lifetime_budget,start_time,end_time',
            'limit' => $limit
        ]);
    }
    
    /**
     * Batch Request - Get multiple insights in one API call
     * @param array $requests Array of requests
     * @return array Batch results
     */
    public function batchRequest($requests) {
        $batch = [];
        
        foreach ($requests as $request) {
            $batch[] = [
                'method' => $request['method'] ?? 'GET',
                'relative_url' => $request['url']
            ];
        }
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, "https://graph.facebook.com/{$this->apiVersion}/");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query([
            'batch' => json_encode($batch),
            'access_token' => $this->accessToken
        ]));
        
        $response = curl_exec($ch);
        curl_close($ch);
        
        return json_decode($response, true);
    }
}
?>

