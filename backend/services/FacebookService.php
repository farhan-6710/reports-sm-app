<?php
class FacebookService
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

        // SSL Configuration - aligned with InstagramService and FacebookAdsService
        // Try to find CA bundle in common locations
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
            // Development mode: disable SSL verification if no CA bundle found
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
        }

        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_MAXREDIRS, 3);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);

        // Remove deprecated curl_close() for PHP 8.5+
        if (function_exists('curl_close')) {
            @curl_close($ch);
        }
        unset($ch);

        if ($curlError) {
            error_log("Facebook API CURL Error: " . $curlError);
            throw new Exception("Network error: " . $curlError);
        }

        $data = json_decode($response, true);

        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log("JSON decode error: " . json_last_error_msg());
            throw new Exception("Invalid JSON response from Facebook API");
        }

        if ($httpCode !== 200 || isset($data['error'])) {
            $errorMessage = $data['error']['message'] ?? 'Unknown API error';
            error_log("Facebook API Error (HTTP $httpCode): " . $errorMessage);

            // Handle specific errors gracefully
            $errorCode = $data['error']['code'] ?? $httpCode;
            if (strpos(strtolower($errorMessage), 'deprecat') !== false || $errorCode == 12) {
                // Return 'deprecated' status if possible, or let caller handle
                throw new Exception('Facebook API Deprecation Warning: ' . $errorMessage);
            }

            throw new Exception('Facebook API Error: ' . $errorMessage);
        }

        return $data;
    }

    public function getPageInsights($pageId, $metric, $since, $until)
    {
        $url = "https://graph.facebook.com/v18.0/{$pageId}/insights";

        $params = [
            'metric' => $metric,
            'since' => $since,
            'until' => $until,
            'access_token' => $this->accessToken
        ];

        return $this->makeRequest($url, $params);
    }

    public function getPageStats($pageId, $startDate, $endDate)
    {
        // First, get basic page info
        $pageInfo = $this->getPageInfo($pageId);

        // Try to fetch insights (may fail if permissions missing)
        $stats = [];
        $metrics = [
            'page_impressions',
            'page_post_engagements',
            'page_views_total',
            'page_fan_adds', // New followers
            'page_actions_post_reactions_total'
        ];

        foreach ($metrics as $metric) {
            try {
                $data = $this->getPageInsights($pageId, $metric, $startDate, $endDate);
                if (isset($data['data'][0]['values'])) {
                    $stats[$metric] = $data['data'][0]['values'];
                }
            } catch (Exception $e) {
                error_log("Failed to get metric $metric: " . $e->getMessage());
                // Continue with other metrics
            }
        }

        // Get posts for top posts
        $topPosts = [];
        try {
            $posts = $this->getDetailedPostsReport($pageId, $pageInfo['fan_count'] ?? 0, 50);

            // Sort posts by engagement to get top 5
            usort($posts, function ($a, $b) {
                return $b['engagement'] - $a['engagement'];
            });
            $topPosts = array_slice($posts, 0, 5);
        } catch (Exception $e) {
            error_log("Note: Skipping posts fetch due to API issue (non-critical): " . $e->getMessage());
            $topPosts = [];
        }

        return [
            'organic' => $this->calculateOrganicMetrics($stats, $pageInfo, $topPosts),
            'inorganic' => $this->calculateInorganicMetrics($stats)
        ];
    }

    public function getPageInfo($pageId)
    {
        $url = "https://graph.facebook.com/v18.0/{$pageId}";

        $params = [
            'fields' => 'name,fan_count,followers_count,about',
            'access_token' => $this->accessToken
        ];

        return $this->makeRequest($url, $params);
    }

    private function calculateOrganicMetrics($stats, $pageInfo = [], $topPosts = [])
    {
        return [
            'name' => $pageInfo['name'] ?? 'Unknown',
            'about' => $pageInfo['about'] ?? '',
            'followers' => $pageInfo['fan_count'] ?? 0,
            'following' => $pageInfo['followers_count'] ?? 0,

            // Engagement metrics
            'impressions' => $this->sumValues($stats['page_impressions'] ?? []),
            'post_engagements' => $this->sumValues($stats['page_post_engagements'] ?? []),
            'total_reactions' => $this->sumValues($stats['page_actions_post_reactions_total'] ?? []),

            // New metrics
            'new_followers' => $this->sumValues($stats['page_fan_adds'] ?? []),
            'profile_views' => $this->sumValues($stats['page_views_total'] ?? []),
            'page_views' => $this->sumValues($stats['page_views_total'] ?? []),

            // Top content
            'top_posts' => $topPosts,
            'posts_count' => count($topPosts) > 0 ? count($topPosts) : 0,
        ];
    }

    private function calculateInorganicMetrics($stats)
    {
        // Ads metrics would come from Facebook Ads API
        return [
            'spend' => 0,
            'reach' => 0,
            'impressions' => 0,
            'clicks' => 0,
            'conversions' => 0
        ];
    }

    private function sumValues($values)
    {
        return array_sum(array_column($values, 'value'));
    }

    public function getDetailedPostsReport($pageId, $followers, $limit = 25)
    {
        // Get recent posts
        $url = "https://graph.facebook.com/v18.0/{$pageId}/posts";

        // Use minimal fields to avoid deprecation errors - no aggregated fields
        $params = [
            'fields' => 'id,message,created_time,full_picture,permalink_url,type',
            'limit' => $limit,
            'access_token' => $this->accessToken
        ];

        try {
            $data = $this->makeRequest($url, $params);
            $posts = $data['data'] ?? [];
        } catch (Exception $e) {
            // Handle deprecation error gracefully
            $msg = $e->getMessage();
            if (strpos(strtolower($msg), 'deprecat') !== false) { // Removed errorCode check as it's not available here directly
                error_log("Facebook API deprecation warning: " . $msg);
                return [];
            }
            throw $e;
        }

        if (empty($posts)) {
            error_log("No posts returned from Facebook API for page: $pageId");
        }

        $detailedPosts = [];

        foreach ($posts as $post) {
            // Try to get reactions and comments, but don't fail if there's an error
            $id = $post['id'];
            $reactions = 0;
            $comments = 0;
            $shares = 0;
            $insights = ['reach' => 0, 'impressions' => 0, 'video_views' => 0];

            try {
                $reactions = $this->getPostReactionsCount($id);
            } catch (Exception $e) {
            }
            try {
                $comments = $this->getPostCommentsCount($id);
            } catch (Exception $e) {
            }
            try {
                $sharesData = $this->getPostShares($id);
                $shares = $sharesData; // Assuming getPostShares returns int
            } catch (Exception $e) {
            }
            try {
                $insights = $this->getPostInsights($id);
            } catch (Exception $e) {
            }

            $engagement = $reactions + $comments + $shares;
            $engagementRate = $followers > 0 ? round(($engagement / $followers) * 100, 2) : 0;

            $detailedPosts[] = [
                'id' => $id,
                'caption' => $post['message'] ?? '',
                'media_type' => strtoupper($post['type'] ?? 'STATUS'),
                'media_url' => $post['full_picture'] ?? '',
                'thumbnail_url' => $post['full_picture'] ?? '',
                'permalink' => $post['permalink_url'] ?? '',
                'timestamp' => $post['created_time'] ?? '',
                'likes' => $reactions,
                'comments' => $comments,
                'shares' => $shares,
                'engagement' => $engagement,
                'engagement_rate' => $engagementRate,
                'reach' => $insights['reach'] ?? 0,
                'impressions' => $insights['impressions'] ?? 0,
                'saved' => 0, // Not available for Facebook
                'video_views' => $insights['video_views'] ?? 0,
            ];
        }

        return $detailedPosts;
    }

    private function getPostReactionsCount($postId)
    {
        $url = "https://graph.facebook.com/v18.0/{$postId}";
        $params = [
            'fields' => 'reactions.summary(total_count)', // Try summary first
            'access_token' => $this->accessToken
        ];

        try {
            $data = $this->makeRequest($url, $params);
            if (isset($data['reactions']['summary']['total_count'])) {
                return $data['reactions']['summary']['total_count'];
            }
            if (isset($data['reactions']['data'])) {
                return count($data['reactions']['data']);
            }
        } catch (Exception $e) {
            // Fallback to simple fields if summary fails
            try {
                $params['fields'] = 'reactions';
                $data = $this->makeRequest($url, $params);
                return isset($data['reactions']['data']) ? count($data['reactions']['data']) : 0;
            } catch (Exception $e2) {
                return 0;
            }
        }
        return 0;
    }

    private function getPostCommentsCount($postId)
    {
        $url = "https://graph.facebook.com/v18.0/{$postId}";
        $params = [
            'fields' => 'comments.summary(total_count)',
            'access_token' => $this->accessToken
        ];

        try {
            $data = $this->makeRequest($url, $params);
            if (isset($data['comments']['summary']['total_count'])) {
                return $data['comments']['summary']['total_count'];
            }
            if (isset($data['comments']['data'])) {
                return count($data['comments']['data']);
            }
        } catch (Exception $e) {
            try {
                $params['fields'] = 'comments';
                $data = $this->makeRequest($url, $params);
                return isset($data['comments']['data']) ? count($data['comments']['data']) : 0;
            } catch (Exception $e2) {
                return 0;
            }
        }
        return 0;
    }

    private function getPostShares($postId)
    {
        // Shares is a field on the post object, not an edge
        $url = "https://graph.facebook.com/v18.0/{$postId}";
        $params = [
            'fields' => 'shares',
            'access_token' => $this->accessToken
        ];

        try {
            $data = $this->makeRequest($url, $params);
            return $data['shares']['count'] ?? 0;
        } catch (Exception $e) {
            return 0;
        }
    }

    private function getPostInsights($postId)
    {
        $url = "https://graph.facebook.com/v18.0/{$postId}/insights";

        $params = [
            'metric' => 'post_impressions,post_impressions_unique,post_video_views',
            'access_token' => $this->accessToken
        ];

        try {
            $data = $this->makeRequest($url, $params);
        } catch (Exception $e) {
            return ['reach' => 0, 'impressions' => 0, 'video_views' => 0];
        }

        $insights = [];
        if (isset($data['data']) && is_array($data['data'])) {
            foreach ($data['data'] as $metric) {
                $metricName = $metric['name'];
                $value = $metric['values'][0]['value'] ?? 0;

                if ($metricName === 'post_impressions') {
                    $insights['impressions'] = $value;
                } elseif ($metricName === 'post_impressions_unique') {
                    $insights['reach'] = $value;
                } elseif ($metricName === 'post_video_views') {
                    $insights['video_views'] = $value;
                }
            }
        }

        return [
            'reach' => $insights['reach'] ?? 0,
            'impressions' => $insights['impressions'] ?? 0,
            'video_views' => $insights['video_views'] ?? 0
        ];
    }
}
?>