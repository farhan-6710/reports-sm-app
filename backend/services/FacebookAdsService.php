<?php
/**
 * Facebook Ads Service
 * Fetch campaign, ad set, and ad-level data from Facebook Marketing API
 */

class FacebookAdsService
{
    private $accessToken;

    public function __construct($accessToken)
    {
        $this->accessToken = $accessToken;
    }

    /**
     * Helper method for making CURL requests with consistent error handling and SSL fix
     */
    private function makeRequest($url, $params = [], $timeout = 30)
    {
        $fullUrl = $url . (!empty($params) ? '?' . http_build_query($params) : '');

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $fullUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);

        // SSL Configuration
        $caBundle = ini_get('curl.cainfo') ?: getenv('SSL_CERT_FILE');
        $possibleCABundles = [
            $caBundle,
            'C:/php/extras/ssl/cacert.pem',
            'C:/wamp/bin/php/php8.x.x/extras/ssl/cacert.pem',
            'C:/xampp/apache/bin/curl-ca-bundle.crt',
            __DIR__ . '/../../cacert.pem', // Project root cacert
            __DIR__ . '/../cacert.pem'     // Backend cacert
        ];

        $caBundleFound = false;
        foreach ($possibleCABundles as $bundle) {
            if ($bundle && file_exists($bundle)) {
                curl_setopt($ch, CURLOPT_CAINFO, $bundle);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
                curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 2);
                $caBundleFound = true;
                break;
            }
        }

        if (!$caBundleFound) {
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
        }

        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_MAXREDIRS, 3);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);

        if (function_exists('curl_close')) {
            @curl_close($ch);
        }
        unset($ch);

        if ($curlError) {
            error_log("Facebook Ads API CURL Error: " . $curlError);
            throw new Exception("Network error: " . $curlError);
        }

        $data = json_decode($response, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log("JSON decode error: " . json_last_error_msg());
            throw new Exception("Invalid JSON response from Facebook API");
        }

        // Handle errors
        if ($httpCode !== 200 || isset($data['error'])) {
            $errorMessage = $data['error']['message'] ?? 'Unknown API error';
            error_log("Facebook Ads API Error (HTTP $httpCode): " . $errorMessage);

            // Allow caller to handle specific errors by returning the error structure
            // But if it's a generic request failure, throw exception
            if (isset($data['error'])) {
                // For getCampaignReport we might want to catch this upstream, 
                // but for now let's throw to be consistent with previous logic
                // or return the data so the caller can check ['error']
                // The previous implementation threw exceptions for non-200.
                throw new Exception("Facebook API Error: " . $errorMessage);
            }
        }

        return $data;
    }

    /**
     * Get ad account currency
     */
    public function getAdAccountInfo($adAccountId)
    {
        // Handle "act_" prefix if present or missing
        if (strpos($adAccountId, 'act_') !== 0) {
            $adAccountId = 'act_' . $adAccountId;
        }

        $url = "https://graph.facebook.com/v18.0/{$adAccountId}";

        $params = [
            'fields' => 'currency,name,account_status',
            'access_token' => $this->accessToken
        ];

        return $this->makeRequest($url, $params);
    }

    /**
     * Get all campaigns for an ad account
     */
    public function getCampaigns($adAccountId, $startDate, $endDate)
    {
        // Handle "act_" prefix
        if (strpos($adAccountId, 'act_') !== 0) {
            $adAccountId = 'act_' . $adAccountId;
        }

        $url = "https://graph.facebook.com/v18.0/{$adAccountId}/campaigns";

        $params = [
            'fields' => 'id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time,insights.time_range({"since":"' . $startDate . '","until":"' . $endDate . '"}){spend,impressions,reach,clicks,actions,cpc,cpm,cpp,ctr,frequency,account_currency}',
            'access_token' => $this->accessToken,
            'limit' => 100
        ];

        return $this->makeRequest($url, $params);
    }

    /**
     * Get ad sets for a campaign
     */
    public function getAdSets($campaignId, $startDate, $endDate)
    {
        $url = "https://graph.facebook.com/v18.0/{$campaignId}/adsets";

        $params = [
            'fields' => 'id,name,status,optimization_goal,billing_event,daily_budget,lifetime_budget,start_time,end_time,targeting,insights.time_range({"since":"' . $startDate . '","until":"' . $endDate . '"}){spend,impressions,reach,clicks,actions,cpc,cpm,cpp,ctr,frequency,account_currency}',
            'access_token' => $this->accessToken,
            'limit' => 100
        ];

        return $this->makeRequest($url, $params);
    }

    /**
     * Get ads for an ad set
     */
    public function getAds($adSetId, $startDate, $endDate)
    {
        $url = "https://graph.facebook.com/v18.0/{$adSetId}/ads";

        $params = [
            'fields' => 'id,name,status,creative{id,name,title,body,image_url,video_id,thumbnail_url,object_story_spec},insights.time_range({"since":"' . $startDate . '","until":"' . $endDate . '"}){spend,impressions,reach,clicks,actions,cpc,cpm,cpp,ctr,frequency,cost_per_action_type,action_values,account_currency}',
            'access_token' => $this->accessToken,
            'limit' => 100
        ];

        return $this->makeRequest($url, $params);
    }

    /**
     * Extract metrics from insights data
     */
    private function extractMetrics($insights, $accountCurrency = 'INR')
    {
        if (empty($insights)) {
            return [
                'spend' => 0,
                'impressions' => 0,
                'reach' => 0,
                'clicks' => 0,
                'engagement' => 0,
                'ctr' => 0,
                'cpc' => 0,
                'cpm' => 0,
                'cpp' => 0,
                'frequency' => 0,
                'leads' => 0,
                'cost_per_lead' => 0,
                'currency' => $accountCurrency
            ];
        }

        // Use the account-level currency passed in (more reliable than per-metric)
        $currency = $accountCurrency;

        $spend = floatval($insights['spend'] ?? 0);
        $cpc = floatval($insights['cpc'] ?? 0);
        $cpm = floatval($insights['cpm'] ?? 0);
        $cpp = floatval($insights['cpp'] ?? 0);

        // Extract leads and engagement from actions
        $leads = 0;
        $engagement = 0;
        if (!empty($insights['actions'])) {
            foreach ($insights['actions'] as $action) {
                $type = $action['action_type'];
                $val = intval($action['value'] ?? 0);

                // Leads
                if ($type === 'lead' || $type === 'onsite_conversion.lead_grouped') {
                    $leads += $val;
                }

                // Engagement aggregation
                if (
                    in_array($type, [
                        'post_engagement',
                        'post_reaction',
                        'comment',
                        'post_save',
                        'onsite_conversion.post_save',
                        'link_click',
                        'share',
                        'page_engagement'
                    ])
                ) {
                    $engagement += $val;
                }
            }
        }

        // Calculate cost per lead
        $costPerLead = ($leads > 0) ? ($spend / $leads) : 0;

        return [
            'spend' => $spend,
            'impressions' => intval($insights['impressions'] ?? 0),
            'reach' => intval($insights['reach'] ?? 0),
            'clicks' => intval($insights['clicks'] ?? 0),
            'engagement' => $engagement,
            'ctr' => floatval($insights['ctr'] ?? 0),
            'cpc' => $cpc,
            'cpm' => $cpm,
            'cpp' => $cpp,
            'frequency' => floatval($insights['frequency'] ?? 0),
            'leads' => $leads,
            'cost_per_lead' => $costPerLead,
            'currency' => $currency
        ];
    }

    /**
     * Extract conversion data
     */
    private function extractConversions($insights)
    {
        if (empty($insights['actions'])) {
            return [];
        }

        $conversions = [];
        foreach ($insights['actions'] as $action) {
            $conversions[$action['action_type']] = intval($action['value']);
        }

        return $conversions;
    }

    /**
     * Extract targeting information
     */
    private function extractTargeting($targeting)
    {
        if (empty($targeting)) {
            return [];
        }

        return [
            'age_min' => $targeting['age_min'] ?? null,
            'age_max' => $targeting['age_max'] ?? null,
            'genders' => $targeting['genders'] ?? [],
            'geo_locations' => $targeting['geo_locations'] ?? [],
            'interests' => $targeting['interests'] ?? [],
            'behaviors' => $targeting['behaviors'] ?? []
        ];
    }

    /**
     * Extract creative information
     */
    private function extractCreative($creative)
    {
        if (empty($creative)) {
            return null;
        }

        return [
            'id' => $creative['id'] ?? null,
            'name' => $creative['name'] ?? null,
            'title' => $creative['title'] ?? null,
            'body' => $creative['body'] ?? null,
            'image_url' => $creative['image_url'] ?? null,
            'video_id' => $creative['video_id'] ?? null,
            'thumbnail_url' => $creative['thumbnail_url'] ?? null
        ];
    }

    /**
     * Calculate account-level summary
     */
    private function calculateAccountSummary($campaigns, $accountCurrency = 'INR')
    {
        $summary = [
            'total_campaigns' => count($campaigns),
            'active_campaigns' => 0,
            'total_spend' => 0,
            'total_impressions' => 0,
            'total_reach' => 0,
            'total_clicks' => 0,
            'total_leads' => 0,
            'total_engagement' => 0,
            'avg_ctr' => 0,
            'avg_cpc' => 0,
            'avg_cpm' => 0,
            'avg_cost_per_lead' => 0,
            'currency' => $accountCurrency
        ];

        $totalCtr = 0;
        $totalCpc = 0;
        $totalCpm = 0;
        $activeCampaigns = 0;

        foreach ($campaigns as $campaign) {
            if ($campaign['status'] === 'ACTIVE') {
                $summary['active_campaigns']++;
            }

            if (isset($campaign['insights']['data'][0])) {
                $insights = $campaign['insights']['data'][0];

                $metrics = $this->extractMetrics($insights, $accountCurrency);

                $summary['total_spend'] += $metrics['spend'];
                $summary['total_impressions'] += $metrics['impressions'];
                $summary['total_reach'] += $metrics['reach'];
                $summary['total_clicks'] += $metrics['clicks'];
                $summary['total_leads'] += $metrics['leads'];
                $summary['total_engagement'] += $metrics['engagement'];

                if (!empty($insights['ctr'])) {
                    $totalCtr += floatval($insights['ctr']);
                    $activeCampaigns++;
                }
                if (!empty($insights['cpc'])) {
                    $totalCpc += floatval($insights['cpc']);
                }
                if (!empty($insights['cpm'])) {
                    $totalCpm += floatval($insights['cpm']);
                }
            }
        }

        if ($activeCampaigns > 0) {
            $summary['avg_ctr'] = round($totalCtr / $activeCampaigns, 2);
            $summary['avg_cpc'] = round($totalCpc / $activeCampaigns, 2);
            $summary['avg_cpm'] = round($totalCpm / $activeCampaigns, 2);
        }

        // Calculate average cost per lead
        if ($summary['total_leads'] > 0) {
            $summary['avg_cost_per_lead'] = round($summary['total_spend'] / $summary['total_leads'], 2);
        }

        return $summary;
    }

    /**
     * Get campaign data for a specific period (for comparison)
     */
    public function getCampaignPeriodData($campaignId, $startDate, $endDate)
    {
        $url = "https://graph.facebook.com/v18.0/{$campaignId}";

        $params = [
            'fields' => 'id,name,status,objective,insights.time_range({"since":"' . $startDate . '","until":"' . $endDate . '"}){spend,impressions,reach,clicks,cpc,cpm,ctr,frequency,account_currency}',
            'access_token' => $this->accessToken
        ];

        $data = $this->makeRequest($url, $params);

        $insights = $data['insights']['data'][0] ?? [];
        $currency = $insights['account_currency'] ?? 'INR';

        return [
            'id' => $data['id'] ?? '',
            'name' => $data['name'] ?? '',
            'status' => $data['status'] ?? '',
            'objective' => $data['objective'] ?? '',
            'metrics' => $this->extractMetrics($insights, $currency)
        ];
    }

    /**
     * Get comprehensive campaign report
     */
    public function getCampaignReport($adAccountId, $startDate, $endDate)
    {
        try {
            // First get ad account info to get currency
            $accountInfo = $this->getAdAccountInfo($adAccountId);
            $accountCurrency = $accountInfo['currency'] ?? 'INR';
        } catch (Exception $e) {
            error_log('Error getting account info: ' . $e->getMessage());
            // If account info fails, default to INR but log success=false if you want to stop
            // But we return success=false to be safe
            return [
                'success' => false,
                'error' => 'Failed to fetch account information: ' . $e->getMessage(),
                'data' => []
            ];
        }

        try {
            $campaigns = $this->getCampaigns($adAccountId, $startDate, $endDate);
        } catch (Exception $e) {
            error_log('Error getting campaigns: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Failed to fetch campaigns: ' . $e->getMessage(),
                'data' => []
            ];
        }

        if (!isset($campaigns['data'])) {
            return [
                'success' => false,
                'error' => 'No campaigns found or API error',
                'data' => []
            ];
        }

        $report = [
            'account_id' => $adAccountId,
            'account_currency' => $accountCurrency,
            'date_range' => [
                'start' => $startDate,
                'end' => $endDate
            ],
            'summary' => [],
            'campaigns' => []
        ];

        $activeCampaigns = [];

        foreach ($campaigns['data'] as $campaign) {
            if (!isset($campaign['insights']['data'][0]))
                continue;

            $insights = $campaign['insights']['data'][0];
            $campaignData = [
                'id' => $campaign['id'],
                'name' => $campaign['name'],
                'status' => $campaign['status'],
                'objective' => $campaign['objective'] ?? 'N/A',
                'metrics' => $this->extractMetrics($insights, $accountCurrency),
                'ad_sets' => []
            ];

            // Get ad sets
            $adSets = $this->getAdSets($campaign['id'], $startDate, $endDate);

            if (isset($adSets['data'])) {
                foreach ($adSets['data'] as $adSet) {
                    if (!isset($adSet['insights']['data'][0]))
                        continue;

                    $adSetInsights = $adSet['insights']['data'][0];
                    $adSetData = [
                        'id' => $adSet['id'],
                        'name' => $adSet['name'],
                        'status' => $adSet['status'],
                        'optimization_goal' => $adSet['optimization_goal'] ?? 'N/A',
                        'metrics' => $this->extractMetrics($adSetInsights, $accountCurrency),
                        'ads' => []
                    ];

                    $ads = $this->getAds($adSet['id'], $startDate, $endDate);
                    if (isset($ads['data'])) {
                        foreach ($ads['data'] as $ad) {
                            if (!isset($ad['insights']['data'][0]))
                                continue;
                            $adInsights = $ad['insights']['data'][0];
                            $adSetData['ads'][] = [
                                'id' => $ad['id'],
                                'name' => $ad['name'],
                                'status' => $ad['status'],
                                'creative' => $this->extractCreative($ad['creative'] ?? []),
                                'metrics' => $this->extractMetrics($adInsights, $accountCurrency),
                                'conversions' => $this->extractConversions($adInsights)
                            ];
                        }
                    }
                    $campaignData['ad_sets'][] = $adSetData;
                }
            }

            $report['campaigns'][] = $campaignData;
            $activeCampaigns[] = $campaign;
        }

        $report['summary'] = $this->calculateAccountSummary($activeCampaigns, $accountCurrency);

        return [
            'success' => true,
            'data' => $report
        ];
    }
}
?>