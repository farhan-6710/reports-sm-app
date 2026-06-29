<?php
class InstagramService {
    private $accessToken;

    public function __construct($accessToken) {
        $this->accessToken = $accessToken;
    }
    
    /**
     * Clean and normalize text (remove extra spaces, fix encoding)
     */
    private function cleanText($text) {
        if (empty($text)) return '';
        
        // Decode HTML entities first (handles &amp;, &lt;, &gt;, etc.)
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        
        // Remove HTML tags if any
        $text = strip_tags($text);
        
        // Remove extra whitespace (multiple spaces, tabs, newlines)
        $text = preg_replace('/\s+/', ' ', $text);
        
        // Trim whitespace from start and end
        $text = trim($text);
        
        // Fix common encoding issues (only if mbstring extension is available)
        if (function_exists('mb_convert_encoding')) {
            $text = mb_convert_encoding($text, 'UTF-8', 'UTF-8');
        }
        
        // Remove zero-width characters and other invisible characters
        $text = preg_replace('/[\x{200B}-\x{200D}\x{FEFF}]/u', '', $text);
        
        // Remove control characters except newlines and tabs
        $text = preg_replace('/[\x00-\x08\x0B-\x0C\x0E-\x1F\x7F]/u', '', $text);
        
        // Normalize unicode characters (only if intl extension is available)
        if (function_exists('normalizer_normalize') && class_exists('Normalizer')) {
            $text = normalizer_normalize($text, Normalizer::FORM_C);
        }
        
        return $text;
    }
    
    /**
     * Helper method for making CURL requests with consistent error handling
     */
    private function makeCurlRequest($url, $params = [], $timeout = 30) {
        $fullUrl = $url . (!empty($params) ? '?' . http_build_query($params) : '');
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $fullUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, $timeout);
        curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 10);
        
        // SSL Configuration - Try multiple methods to fix SSL issues
        $caBundle = ini_get('curl.cainfo') ?: getenv('SSL_CERT_FILE');
        
        // Try to find CA bundle in common locations
        $possibleCABundles = [
            $caBundle,
            'C:/php/extras/ssl/cacert.pem',
            'C:/wamp/bin/php/php8.x.x/extras/ssl/cacert.pem',
            'C:/xampp/apache/bin/curl-ca-bundle.crt',
            __DIR__ . '/../../cacert.pem'
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
            // WARNING: This is insecure and should only be used in development
            curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
            curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
            // Don't log warning for every request - too noisy
        }
        
        curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
        curl_setopt($ch, CURLOPT_MAXREDIRS, 3);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        $curlErrno = curl_errno($ch);
        // curl_close() is deprecated in PHP 8.5+ and has no effect since PHP 8.0
        // Just unset the handle - PHP automatically closes it
        unset($ch);
        
        // Check for CURL errors
        if ($curlError || $curlErrno !== 0) {
            $errorMsg = "Network error: " . ($curlError ?: "CURL error code: $curlErrno");
            error_log("CURL Error: " . $errorMsg . " (URL: $fullUrl)");
            error_log("CURL Error Details - Code: $curlErrno, Message: $curlError, HTTP Code: $httpCode");
            throw new Exception($errorMsg . " (CURL Error Code: $curlErrno)");
        }
        
        // Check for empty response
        if ($response === false || $response === null || $response === '') {
            error_log("Empty or null response from API (URL: $fullUrl, HTTP Code: $httpCode)");
            if ($httpCode !== 200) {
                throw new Exception("Instagram API Error: HTTP $httpCode - Empty response. Check your access token and account ID.");
            }
            throw new Exception("Network error: Empty response from API");
        }
        
        // Decode JSON
        $data = json_decode($response, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            error_log("JSON decode error: " . json_last_error_msg() . " (URL: $fullUrl, Response: " . substr($response, 0, 200) . ")");
            throw new Exception("Network error: Invalid JSON response from API");
        }
        
        // Check if data is null after decoding
        if ($data === null) {
            error_log("Decoded JSON is null (URL: $fullUrl, HTTP Code: $httpCode, Response: " . substr($response, 0, 200) . ")");
            throw new Exception("Instagram API Error: Got unexpected null response. Check your access token and account ID.");
        }
        
        // Check for API errors
        if ($httpCode !== 200 || isset($data['error'])) {
            $errorMessage = $data['error']['message'] ?? 'Unknown API error';
            $errorCode = $data['error']['code'] ?? 'Unknown';
            $errorSubcode = $data['error']['error_subcode'] ?? null;
            error_log("API Error (HTTP $httpCode, Code $errorCode" . ($errorSubcode ? ", Subcode $errorSubcode" : "") . "): " . $errorMessage . " (URL: $fullUrl)");
            
            // Provide more helpful error messages
            if ($errorCode == 190 || strpos($errorMessage, 'token') !== false || strpos($errorMessage, 'expired') !== false) {
                throw new Exception("Instagram API Error: Access token is invalid or expired. Please generate a new token from Graph API Explorer.");
            }
            if ($errorCode == 100 || strpos($errorMessage, 'does not exist') !== false) {
                throw new Exception("Instagram API Error: Account ID does not exist or is not accessible. Verify the Instagram Business Account ID.");
            }
            
            throw new Exception("Instagram API Error ($errorCode): " . $errorMessage);
        }
        
        return $data;
    }

    public function getAccountInsights($accountId, $startDate, $endDate) {
        // Wrap entire method in try-catch to ensure we NEVER throw - always return valid structure
        try {
        // Get basic account info (may fail - handle gracefully)
        $accountInfo = [];
        try {
            $accountInfo = $this->getAccountInfo($accountId);
            error_log("Successfully fetched account info for $accountId: followers=" . ($accountInfo['followers_count'] ?? 'N/A'));
        } catch (Exception $e) {
            error_log("Could not get account info for $accountId: " . $e->getMessage());
            // Try one more time with a fresh call
            try {
                error_log("Retrying account info fetch for $accountId...");
                $accountInfo = $this->getAccountInfo($accountId);
                error_log("Retry successful: followers=" . ($accountInfo['followers_count'] ?? 'N/A'));
            } catch (Exception $e2) {
                error_log("Retry also failed: " . $e2->getMessage());
                // Use default values if account info fails
                $accountInfo = [
                    'username' => 'Unknown',
                    'name' => 'Unknown',
                    'followers_count' => 0,
                    'media_count' => 0,
                    'profile_picture_url' => ''
                ];
            }
        }
        
        // Get recent media to calculate engagement (may fail - handle gracefully)
        $media = [];
        try {
            $media = $this->getRecentMedia($accountId, 100); // Get more posts to filter by date
        } catch (Exception $e) {
            error_log("Could not get recent media for $accountId: " . $e->getMessage());
            // Continue with empty media array - we'll still return basic account structure
            $media = [];
        }
        
        // Filter media by date range
        $filteredMedia = array_filter($media, function($post) use ($startDate, $endDate) {
            $postDate = date('Y-m-d', strtotime($post['timestamp']));
            return $postDate >= $startDate && $postDate <= $endDate;
        });
        
        error_log("Filtered " . count($filteredMedia) . " posts from " . count($media) . " total (date range: $startDate to $endDate)");
        
        // Get stories (also filter by date) - may fail, handle gracefully
        $stories = [];
        $filteredStories = [];
        try {
            $stories = $this->getRecentStories($accountId);
            $filteredStories = array_filter($stories, function($story) use ($startDate, $endDate) {
                $storyDate = date('Y-m-d', strtotime($story['timestamp']));
                return $storyDate >= $startDate && $storyDate <= $endDate;
            });
        } catch (Exception $e) {
            error_log("Could not get stories for $accountId: " . $e->getMessage());
            // Continue with empty stories array
            $stories = [];
            $filteredStories = [];
        }
        
        // Calculate totals from filtered media only
        $totalLikes = 0;
        $totalComments = 0;
        $totalShares = 0;
        $totalSaves = 0;
        $totalViews = 0;
        $postsCount = 0;
        $reelsCount = 0;
        $videosCount = 0;
        $photosCount = 0;
        
        $postsWithEngagement = [];
        
        foreach ($filteredMedia as $post) {
            $likes = $post['like_count'] ?? 0;
            $comments = $post['comments_count'] ?? 0;
            $mediaType = $post['media_type'] ?? 'IMAGE';
            
            $totalLikes += $likes;
            $totalComments += $comments;
            
            // Get views for all content types (images and reels)
            // Instagram deprecated "impressions" and "plays" - now uses unified "views" metric
            $mediaProductType = $post['media_product_type'] ?? '';
            $views = 0; // Initialize views
            
            if ($mediaType === 'VIDEO' || $mediaProductType === 'REELS') {
                // For videos and reels, get views (replaces deprecated plays/impressions)
                $views = $this->getPostImpressions($post['id']);
                $totalViews += $views;
                if ($mediaProductType === 'REELS') {
                    $reelsCount++;
                } else {
                    $videosCount++;
                }
            } elseif ($mediaType === 'IMAGE' || $mediaType === 'CAROUSEL_ALBUM') {
                // For images, get views metric (replaces deprecated impressions)
                $views = $this->getPostImpressions($post['id']);
                $totalViews += $views;
                if ($mediaType === 'CAROUSEL_ALBUM') {
                    $postsCount++;
                } else {
                    $photosCount++;
                }
            }
            
            // Store for top posts calculation (including views)
            $postsWithEngagement[] = [
                'post' => $post,
                'engagement' => $likes + $comments,
                'likes' => $likes,
                'comments' => $comments,
                'views' => $views // Using views metric (replaces deprecated impressions/plays)
            ];
        }
        
        $postsCount = count($filteredMedia);
        $totalEngagement = $totalLikes + $totalComments;
        // Get followers from account info - ensure it's not null/0 if account info was fetched
        $followers = $accountInfo['followers_count'] ?? 0;
        // If followers is 0 but we have account info, try to get it again
        if ($followers == 0 && !empty($accountInfo) && isset($accountInfo['username'])) {
            // Account info exists but followers_count might be missing - try direct API call
            try {
                $directInfo = $this->getAccountInfo($accountId);
                $followers = $directInfo['followers_count'] ?? 0;
            } catch (Exception $e) {
                error_log("Could not get followers count: " . $e->getMessage());
            }
        }
        $engagementRate = $followers > 0 ? round(($totalEngagement / $followers) * 100, 2) : 0;
        
        // Sort posts by engagement to get top 5 from filtered posts
        usort($postsWithEngagement, function($a, $b) {
            return $b['engagement'] - $a['engagement'];
        });
        $topPosts = array_slice($postsWithEngagement, 0, 5);
        
        // Try to get account-level insights (may fail if permissions are missing - that's OK)
        $accountInsights = [];
        try {
            $accountInsights = $this->getAccountLevelInsights($accountId, $startDate, $endDate);
            error_log("Account-level insights fetched: reach=" . ($accountInsights['reach'] ?? 'N/A') . ", profile_visits=" . ($accountInsights['profile_visits'] ?? 'N/A'));
        } catch (Exception $e) {
            error_log("Could not fetch account-level insights (non-critical): " . $e->getMessage());
            // Continue with empty insights - we still have post data
            $accountInsights = [];
        }
        
        // Calculate total reach from posts if account-level reach is not available
        // NOTE: This is disabled to prevent timeout - individual post reach calls are too slow
        // Instead, we'll use the reach from account-level insights or approximate from total_views
        $totalReachFromPosts = 0;
        // Removed the loop to prevent timeout - if account-level reach is 0, we'll use total_views as approximation
        if (($accountInsights['reach'] ?? 0) == 0 && $totalViews > 0) {
            // Approximate reach from total views (reach is typically 70-80% of views)
            $accountInsights['reach'] = (int)($totalViews * 0.75);
            error_log("Account-level reach is 0, approximating from total_views: {$accountInsights['reach']}");
        }
        
        // Get follower growth (new followers) - try API first, then database
        $followerGrowth = ['new_followers' => null, 'follower_data_available' => false];
        $dbAccountId = null; // Will be set if we need to use database
        
        // Try to get database account ID for tracking
        try {
            require_once __DIR__ . '/../config/database.php';
            $db = new Database();
            $conn = $db->getConnection();
            $stmt = $conn->prepare("SELECT id FROM accounts WHERE account_id = ? AND platform = 'instagram' AND is_active = 1 LIMIT 1");
            $stmt->execute([$accountId]);
            $accountRow = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($accountRow) {
                $dbAccountId = $accountRow['id'];
            }
        } catch (Exception $e) {
            error_log("Could not get database account ID: " . $e->getMessage());
        }
        
        try {
            $followerGrowth = $this->getFollowerGrowth($accountId, $startDate, $endDate);
            
            // If API worked and we have database account ID, save snapshot
            if ($followerGrowth['follower_data_available'] && $dbAccountId && isset($accountInfo['followers'])) {
                try {
                    require_once __DIR__ . '/FollowerTracker.php';
                    $tracker = new FollowerTracker();
                    $tracker->saveSnapshot($dbAccountId, $accountInfo['followers'], date('Y-m-d'));
                    error_log("Saved follower snapshot: Account ID $dbAccountId, Count: {$accountInfo['followers']}");
                } catch (Exception $e) {
                    error_log("Could not save follower snapshot: " . $e->getMessage());
                }
            }
        } catch (Exception $e) {
            error_log("Could not fetch follower growth from API (non-critical): " . $e->getMessage());
        }
        
        // If API failed, try database as fallback
        if (!$followerGrowth['follower_data_available'] && $dbAccountId) {
            try {
                require_once __DIR__ . '/FollowerTracker.php';
                $tracker = new FollowerTracker();
                $dbGrowth = $tracker->getFollowerGrowth($dbAccountId, $startDate, $endDate);
                if ($dbGrowth['data_available']) {
                    $followerGrowth = $dbGrowth;
                    error_log("Using database follower growth: {$dbGrowth['new_followers']} new followers");
                }
            } catch (Exception $e) {
                error_log("Could not fetch follower growth from database: " . $e->getMessage());
            }
        }
        
        // Ensure we always return a valid structure even if everything failed
        // At minimum, return basic account info
        if (empty($media) && empty($accountInfo)) {
            error_log("Warning: No data available for account $accountId - returning minimal structure");
            // Return minimal valid structure
            return [
                'organic' => [
                    'username' => 'Unknown',
                    'name' => 'Unknown',
                    'profile_picture' => '',
                    'followers' => 0,
                    'following' => 0,
                    'posts_count' => 0,
                    'media_count' => 0,
                    'total_likes' => 0,
                    'total_comments' => 0,
                    'total_engagement' => 0,
                    'engagement_rate' => 0,
                    'avg_likes_per_post' => 0,
                    'avg_comments_per_post' => 0,
                    'new_followers' => null,
                    'profile_visits' => null,
                    'reach' => null,
                    'impressions' => null,
                    'website_clicks' => null,
                    'total_views' => 0,
                    'email_contacts' => null,
                    'phone_calls' => null,
                    'accounts_engaged' => null,
                    'photos_count' => 0,
                    'videos_count' => 0,
                    'reels_count' => 0,
                    'stories_count' => 0,
                    'top_posts' => [],
                    'all_posts_summary' => [],
                    'top_stories' => [],
                    'all_stories' => []
                ],
                'content_performance' => [
                    'posts' => [],
                    'stories' => []
                ],
                'inorganic' => [
                    'spend' => 0,
                    'reach' => 0,
                    'impressions' => 0,
                    'engagements' => 0
                ]
            ];
        }
        
            return [
                'organic' => [
                    'username' => $accountInfo['username'] ?? 'Unknown',
                    'name' => $accountInfo['name'] ?? 'Unknown',
                    'profile_picture' => $accountInfo['profile_picture_url'] ?? '',
                    'followers' => $followers,
                    'following' => 0, // Not available for Instagram Business accounts
                    'posts_count' => $postsCount,
                    'media_count' => $accountInfo['media_count'] ?? 0,
                
                // Engagement metrics
                'total_likes' => $totalLikes,
                'total_comments' => $totalComments,
                'total_engagement' => $totalEngagement,
                'engagement_rate' => $engagementRate,
                'avg_likes_per_post' => $postsCount > 0 ? round($totalLikes / $postsCount) : 0,
                'avg_comments_per_post' => $postsCount > 0 ? round($totalComments / $postsCount) : 0,
                
                // New metrics
                'new_followers' => $followerGrowth['new_followers'] ?? null,
                'profile_visits' => $accountInsights['profile_visits'] ?? null, // Changed from profile_views to profile_visits
                'reach' => ($accountInsights['reach'] ?? 0) > 0 ? ($accountInsights['reach'] ?? 0) : ($totalViews > 0 ? (int)($totalViews * 0.75) : 0), // Use account-level reach, or approximate from total_views
                // Impressions not available for account-level in v19.0+, but we can approximate from reach or use total_views
                // Priority: 1) reach * 1.3, 2) total_views, 3) 0
                'impressions' => ($accountInsights['reach'] && $accountInsights['reach'] > 0) 
                    ? (int)($accountInsights['reach'] * 1.3) 
                    : ($totalViews > 0 ? $totalViews : 0),
                'website_clicks' => $accountInsights['website_clicks'] ?? null,
                'total_views' => $totalViews, // Total views from posts (for both images and reels)
                'email_contacts' => $accountInsights['email_contacts'] ?? null,
                'phone_calls' => $accountInsights['phone_call_clicks'] ?? null,
                'accounts_engaged' => $accountInsights['accounts_engaged'] ?? null,
                'total_interactions' => $accountInsights['total_interactions'] ?? null,
                
                // Content breakdown (from filtered date range)
                'photos_count' => $photosCount,
                'videos_count' => $videosCount,
                'reels_count' => $reelsCount,
                'stories_count' => count($filteredStories),
                
                // Top content (from filtered date range)
                'top_posts' => array_map(function($item) use ($followers) {
                    return [
                        'id' => $item['post']['id'],
                        'media_type' => $item['post']['media_type'] ?? 'IMAGE',
                        'media_url' => $item['post']['media_url'] ?? '',
                        'thumbnail_url' => $item['post']['thumbnail_url'] ?? $item['post']['media_url'] ?? '',
                        'caption' => $this->cleanText($item['post']['caption'] ?? ''),
                        'permalink' => $item['post']['permalink'] ?? '',
                        'timestamp' => $item['post']['timestamp'] ?? '',
                        'likes' => $item['likes'],
                        'comments' => $item['comments'],
                        'engagement' => $item['engagement'],
                        'engagement_rate' => $followers > 0 ? round(($item['engagement'] / $followers) * 100, 2) : 0,
                        'views' => $item['views'] ?? 0
                    ];
                }, $topPosts),
                
                // All posts summary for day-of-week analysis (lightweight - only essential data)
                'all_posts_summary' => array_map(function($item) {
                    return [
                        'timestamp' => $item['post']['timestamp'] ?? '',
                        'likes' => $item['likes'],
                        'comments' => $item['comments'],
                        'engagement' => $item['engagement'],
                        'reach' => $item['post']['reach'] ?? 0,
                        'shares' => $item['post']['shares'] ?? 0,
                        'saved' => $item['post']['saved'] ?? 0
                    ];
                }, $postsWithEngagement),
                
                'top_stories' => $this->getTopStoriesSafe($filteredStories),
                'all_stories' => $this->getAllStoriesWithMetricsSafe($filteredStories, $startDate, $endDate)
            ],
            'content_performance' => [
                'posts' => array_map(function($item) use ($followers) {
                    return [
                        'id' => $item['post']['id'],
                        'media_type' => $item['post']['media_type'] ?? 'IMAGE',
                        'media_url' => $item['post']['media_url'] ?? '',
                        'thumbnail_url' => $item['post']['thumbnail_url'] ?? $item['post']['media_url'] ?? '',
                        'caption' => $this->cleanText($item['post']['caption'] ?? ''),
                        'permalink' => $item['post']['permalink'] ?? '',
                        'timestamp' => $item['post']['timestamp'] ?? '',
                        'likes' => $item['likes'],
                        'comments' => $item['comments'],
                        'engagement' => $item['engagement'],
                        'engagement_rate' => $followers > 0 ? round(($item['engagement'] / $followers) * 100, 2) : 0,
                        'views' => $item['views'] ?? 0
                    ];
                }, $postsWithEngagement),
                'stories' => $this->getAllStoriesWithMetricsSafe($filteredStories, $startDate, $endDate)
            ],
            'inorganic' => [
                'spend' => 0,
                'reach' => 0,
                'impressions' => 0,
                'engagements' => 0
            ]
        ];
        } catch (Exception $e) {
            // If ANYTHING goes wrong, return minimal valid structure
            error_log("CRITICAL: getAccountInsights failed completely for $accountId: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            
            return [
                'organic' => [
                    'username' => 'Unknown',
                    'name' => 'Unknown',
                    'profile_picture' => '',
                    'followers' => 0,
                    'following' => 0,
                    'posts_count' => 0,
                    'media_count' => 0,
                    'total_likes' => 0,
                    'total_comments' => 0,
                    'total_engagement' => 0,
                    'engagement_rate' => 0,
                    'avg_likes_per_post' => 0,
                    'avg_comments_per_post' => 0,
                    'new_followers' => null,
                    'profile_visits' => null,
                    'reach' => null,
                    'impressions' => null,
                    'website_clicks' => null,
                    'total_views' => 0,
                    'email_contacts' => null,
                    'phone_calls' => null,
                    'accounts_engaged' => null,
                    'photos_count' => 0,
                    'videos_count' => 0,
                    'reels_count' => 0,
                    'stories_count' => 0,
                    'top_posts' => [],
                    'all_posts_summary' => [],
                    'top_stories' => [],
                    'all_stories' => []
                ],
                'content_performance' => [
                    'posts' => [],
                    'stories' => []
                ],
                'inorganic' => [
                    'spend' => 0,
                    'reach' => 0,
                    'impressions' => 0,
                    'engagements' => 0
                ]
            ];
        }
    }
    
    public function getAccountInfo($accountId) {
        $url = "https://graph.facebook.com/v19.0/{$accountId}";
        
        // Validate access token
        if (empty($this->accessToken)) {
            error_log("InstagramService: Access token is empty for account $accountId");
            throw new Exception("Access token is missing or invalid. Please update the account with a valid Instagram access token.");
        }
        
        $params = [
            'fields' => 'username,name,followers_count,media_count,profile_picture_url',
            'access_token' => $this->accessToken
        ];
        
        try {
            error_log("InstagramService: Fetching account info for $accountId from $url");
            return $this->makeCurlRequest($url, $params, 30);
        } catch (Exception $e) {
            error_log("Error getting account info for $accountId: " . $e->getMessage());
            error_log("Access token length: " . strlen($this->accessToken) . " (first 10 chars: " . substr($this->accessToken, 0, 10) . "...)");
            throw $e;
        }
    }
    
    public function getRecentMedia($accountId, $limit = 25) {
        $url = "https://graph.facebook.com/v19.0/{$accountId}/media";
        
        $params = [
            'fields' => 'id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count,media_product_type',
            'limit' => $limit,
            'access_token' => $this->accessToken
        ];
        
        try {
            $data = $this->makeCurlRequest($url, $params, 30);
            return $data['data'] ?? [];
        } catch (Exception $e) {
            $errorMessage = $e->getMessage();
            // Check if it's a permission error (code 10)
            if (strpos($errorMessage, 'permission') !== false || strpos($errorMessage, '(#10)') !== false) {
                error_log("Permission error getting recent media for $accountId: $errorMessage");
                // Re-throw with a more specific message
                throw new Exception("Instagram API Error: (#10) Application does not have permission for this action. Please regenerate token with pages_read_engagement, instagram_basic, and instagram_manage_insights permissions.");
            }
            error_log("Error getting recent media for $accountId: " . $errorMessage);
            throw $e;
        }
    }
    
    public function getDetailedPostsReport($accountId, $followers, $limit = 25) {
        // Get recent media with all details
        $media = $this->getRecentMedia($accountId, $limit);
        
        $detailedPosts = [];
        
        foreach ($media as $post) {
            $mediaId = $post['id'];
            $likes = $post['like_count'] ?? 0;
            $comments = $post['comments_count'] ?? 0;
            $mediaType = $post['media_type'] ?? 'IMAGE';
            $mediaProductType = $post['media_product_type'] ?? '';
            $engagement = $likes + $comments;
            $engagementRate = $followers > 0 ? round(($engagement / $followers) * 100, 2) : 0;
            
            // Get impressions for all content types (images, reels, videos)
            $impressions = 0;
            $reach = 0;
            $saved = 0;
            $shares = 0;
            
            if ($mediaType === 'VIDEO' || $mediaProductType === 'REELS') {
                // For videos and reels, get views + saved + shares (views replaces deprecated plays/impressions)
                $impressions = $this->getPostImpressions($mediaId);
                $saved = $this->getSavedMetric($mediaId);
                $shares = $this->getSharesMetric($mediaId);
                error_log("Media $mediaId ($mediaType/$mediaProductType): $impressions views, $saved saved, $shares shares");
            } elseif ($mediaType === 'IMAGE' || $mediaType === 'CAROUSEL_ALBUM') {
                // For images and carousels, get impressions + reach + saved + shares in one batch call
                // Note: Images use 'impressions' metric, not 'views'
                $insights = $this->getImageInsightsBatch($mediaId);
                $impressions = $insights['views'] ?? 0; // getImageInsightsBatch maps impressions to 'views' key
                $reach = $insights['reach'] ?? 0;
                $saved = $insights['saved'] ?? 0;
                $shares = $insights['shares'] ?? 0;
                error_log("Media $mediaId ($mediaType): $impressions impressions, $reach reach, $saved saved, $shares shares");
            } else {
                // Fallback for any other type
                $impressions = $this->getPostImpressions($mediaId);
                error_log("Media $mediaId ($mediaType): $impressions views (fallback)");
            }
            
            $detailedPosts[] = [
                'id' => $mediaId,
                'caption' => $this->cleanText($post['caption'] ?? ''),
                'media_type' => $mediaType,
                'media_product_type' => $mediaProductType,
                'media_url' => $post['media_url'] ?? '',
                'thumbnail_url' => $post['thumbnail_url'] ?? $post['media_url'] ?? '',
                'permalink' => $post['permalink'] ?? '',
                'timestamp' => $post['timestamp'] ?? '',
                'likes' => $likes,
                'comments' => $comments,
                'engagement' => $engagement,
                'engagement_rate' => $engagementRate,
                'views' => $impressions, // Using impressions for both images and reels
                'impressions' => $impressions, // Same value for consistency
                'reach' => $reach, // Per-post reach
                'saved' => $saved, // Post saves
                'shares' => $shares, // Post shares
            ];
        }
        
        error_log("Fetched detailed data for " . count($detailedPosts) . " posts");
        
        return $detailedPosts;
    }
    
    /**
     * Get views for videos and reels (multiple methods with fallbacks)
     */
    private function getVideoViews($mediaId, $mediaType = 'VIDEO') {
        // For Reels and Videos, use 'plays' metric (this matches what Instagram shows)
        // Try 'plays' first for both Reels and regular Videos
        $views = $this->getReelPlaysMetric($mediaId);
        if ($views > 0) {
            error_log("Got plays for $mediaType $mediaId: $views");
            return $views;
        }
        
        // Method 2: Try video_views field (works for regular videos, but may not match Instagram exactly)
        if ($mediaType === 'VIDEO') {
            $views = $this->getVideoViewsField($mediaId);
            if ($views > 0) {
                error_log("Got video_views field for $mediaId: $views");
                return $views;
            }
        }
        
        // Method 3: Try impressions as last resort (usually lower than actual views)
        $views = $this->getReelPlays($mediaId);
        if ($views > 0) {
            error_log("Warning: Using impressions fallback for $mediaType $mediaId: $views (may not match Instagram)");
            return $views;
        }
        
        error_log("No views found for $mediaType $mediaId");
        return 0;
    }
    
            /**
             * Get 'plays' metric for Reels (matches what Instagram shows)
             */
            private function getReelPlaysMetric($mediaId) {
                $url = "https://graph.facebook.com/v19.0/{$mediaId}/insights";
                
                // Use 'plays' metric for Reels - this matches Instagram's view count
                $params = [
                    'metric' => 'plays',
                    'period' => 'lifetime',
                    'access_token' => $this->accessToken
                ];
                
                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_TIMEOUT, 5);
                
                $response = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                $curlError = curl_error($ch);
                unset($ch);
                
                if ($curlError) {
                    error_log("Error fetching plays for Reel $mediaId: " . $curlError);
                    return 0;
                }
                
                if ($httpCode === 200) {
                    $data = json_decode($response, true);
                    
                    // Check for API errors
                    if (isset($data['error'])) {
                        error_log("API error fetching plays for Reel $mediaId: " . ($data['error']['message'] ?? 'Unknown error'));
                        return 0;
                    }
                    
                    if (isset($data['data'][0]['values'][0]['value'])) {
                        $plays = $data['data'][0]['values'][0]['value'];
                        error_log("Got plays for Reel $mediaId: $plays");
                        return $plays;
                    } else {
                        error_log("No plays data found for Reel $mediaId. Response: " . json_encode($data));
                    }
                } else {
                    error_log("HTTP $httpCode error fetching plays for Reel $mediaId");
                }
                
                return 0;
            }
            
            /**
             * Method 1: Get total_interactions metric (works for regular videos, NOT for Reels)
             */
            private function getPlaysMetric($mediaId) {
                $url = "https://graph.facebook.com/v19.0/{$mediaId}/insights";
                
                // Try total_interactions for regular videos (not Reels)
                $params = [
                    'metric' => 'total_interactions',
                    'access_token' => $this->accessToken
                ];
                
                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_TIMEOUT, 3);
                
                $response = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                unset($ch);
                
                if ($httpCode === 200) {
                    $data = json_decode($response, true);
                    if (isset($data['data'][0]['values'][0]['value'])) {
                        error_log("Got total_interactions for $mediaId: " . $data['data'][0]['values'][0]['value']);
                        return $data['data'][0]['values'][0]['value'];
                    }
                }
                
                return 0;
            }
            
            /**
             * Get saved metric for videos/reels
             * Returns 0 if permission error (graceful degradation)
             */
            private function getSavedMetric($mediaId) {
                $url = "https://graph.facebook.com/v19.0/{$mediaId}/insights";
                
                $params = [
                    'metric' => 'saved',
                    'access_token' => $this->accessToken
                ];
                
                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_TIMEOUT, 3);
                
                $response = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                unset($ch);
                
                $data = json_decode($response, true);
                
                // Check for API errors (including permission errors)
                if (isset($data['error'])) {
                    $errorCode = $data['error']['code'] ?? 'Unknown';
                    if ($errorCode == 10 || strpos($data['error']['message'] ?? '', 'permission') !== false) {
                        // Permission error - return 0 gracefully
                        return 0;
                    }
                }
                
                if ($httpCode === 200 && isset($data['data'][0]['values'][0]['value'])) {
                    return $data['data'][0]['values'][0]['value'];
                }
                
                return 0;
            }
            
            /**
             * Get shares metric for videos/reels
             * Returns 0 if permission error (graceful degradation)
             */
            private function getSharesMetric($mediaId) {
                $url = "https://graph.facebook.com/v19.0/{$mediaId}/insights";
                
                $params = [
                    'metric' => 'shares',
                    'access_token' => $this->accessToken
                ];
                
                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_TIMEOUT, 3);
                
                $response = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                unset($ch);
                
                $data = json_decode($response, true);
                
                // Check for API errors (including permission errors)
                if (isset($data['error'])) {
                    $errorCode = $data['error']['code'] ?? 'Unknown';
                    if ($errorCode == 10 || strpos($data['error']['message'] ?? '', 'permission') !== false) {
                        // Permission error - return 0 gracefully
                        return 0;
                    }
                }
                
                if ($httpCode === 200 && isset($data['data'][0]['values'][0]['value'])) {
                    return $data['data'][0]['values'][0]['value'];
                }
                
                return 0;
            }
    
    /**
     * Method 2: Get video_views field directly from media object
     */
    private function getVideoViewsField($mediaId) {
        $url = "https://graph.facebook.com/v19.0/{$mediaId}";
        
        $params = [
            'fields' => 'video_views',
            'access_token' => $this->accessToken
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 3);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        unset($ch);
        
        if ($httpCode === 200) {
            $data = json_decode($response, true);
            if (isset($data['video_views'])) {
                return $data['video_views'];
            }
        }
        
        return 0;
    }
    
            /**
             * Get views for any post type (images, reels, videos)
             * Instagram deprecated "impressions" and "plays" - now uses unified "views" metric
             * Returns 0 if permission error or other API error (graceful degradation)
             */
            private function getPostImpressions($mediaId) {
                $url = "https://graph.facebook.com/v19.0/{$mediaId}/insights";
                
                // Use views metric (replaces deprecated impressions/plays for all media types)
                $params = [
                    'metric' => 'views',
                    'period' => 'lifetime',
                    'access_token' => $this->accessToken
                ];
                
                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_TIMEOUT, 10);
                curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
                curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
                
                $response = curl_exec($ch);
                $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
                $curlError = curl_error($ch);
                unset($ch);
                
                if ($curlError) {
                    error_log("CURL error fetching views for $mediaId: " . $curlError);
                    return 0;
                }
                
                $data = json_decode($response, true);
                
                if (json_last_error() !== JSON_ERROR_NONE) {
                    error_log("JSON decode error for views $mediaId: " . json_last_error_msg());
                    return 0;
                }
                
                // Check for API errors (including permission errors)
                if (isset($data['error'])) {
                    $errorMsg = $data['error']['message'] ?? 'Unknown error';
                    $errorCode = $data['error']['code'] ?? 'Unknown';
                    // Don't log permission errors as errors - they're expected if token lacks permissions
                    if ($errorCode == 10 || strpos($errorMsg, 'permission') !== false) {
                        error_log("Views not available for $mediaId (permission required): $errorMsg");
                    } else {
                        error_log("API error fetching views for $mediaId (Code $errorCode): $errorMsg");
                    }
                    return 0; // Gracefully return 0 instead of throwing
                }
                
                if ($httpCode !== 200) {
                    error_log("HTTP $httpCode error fetching views for $mediaId. Response: " . substr($response, 0, 500));
                    return 0;
                }
                
                // Check response structure
                if (!isset($data['data']) || !is_array($data['data']) || empty($data['data'])) {
                    error_log("No data array found in views response for $mediaId");
                    return 0;
                }
                
                // Get the first metric (views)
                $metricData = $data['data'][0];
                
                if (!isset($metricData['values']) || !is_array($metricData['values']) || empty($metricData['values'])) {
                    error_log("No values array found in views response for $mediaId");
                    return 0;
                }
                
                // Get the first value (lifetime period)
                $valueData = $metricData['values'][0];
                
                if (!isset($valueData['value'])) {
                    error_log("No value found in views response for $mediaId");
                    return 0;
                }
                
                $views = $valueData['value'];
                error_log("Successfully got views for $mediaId: $views");
                return $views;
            }
            
            /**
             * Legacy method - redirects to getPostImpressions
             */
            private function getReelPlays($mediaId) {
                return $this->getPostImpressions($mediaId);
            }
    
    /**
     * Get views, reach, saved, AND shares for images in ONE API call (OPTIMIZED)
     * Note: Instagram deprecated "impressions" - now uses "views" for all content types
     * Returns zeros if permission error (graceful degradation)
     */
    private function getImageInsightsBatch($mediaId) {
        $url = "https://graph.facebook.com/v19.0/{$mediaId}/insights";
        
        // Request all metrics in single call (using views instead of deprecated impressions)
        $params = [
            'metric' => 'views,reach,saved,shares',
            'period' => 'lifetime',
            'access_token' => $this->accessToken
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 3);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        unset($ch);
        
        $insights = ['views' => 0, 'reach' => 0, 'saved' => 0, 'shares' => 0];
        
        if ($httpCode === 200) {
            $data = json_decode($response, true);
            
            // Check for API errors (including permission errors)
            if (isset($data['error'])) {
                $errorCode = $data['error']['code'] ?? 'Unknown';
                $errorMsg = $data['error']['message'] ?? 'Unknown error';
                if ($errorCode == 10 || strpos($errorMsg, 'permission') !== false) {
                    error_log("Image insights not available for $mediaId (permission required): $errorMsg");
                } else {
                    error_log("API error fetching image insights for $mediaId (Code $errorCode): $errorMsg");
                }
                // Return zeros - graceful degradation
                $insights['impressions'] = 0;
                return $insights;
            }
            
            if (isset($data['data']) && is_array($data['data'])) {
                foreach ($data['data'] as $metric) {
                    $metricName = $metric['name'];
                    $value = $metric['values'][0]['value'] ?? 0;
                    $insights[$metricName] = $value;
                }
            }
        } else {
            // Check response for error details
            $data = json_decode($response, true);
            if (isset($data['error'])) {
                $errorCode = $data['error']['code'] ?? 'Unknown';
                $errorMsg = $data['error']['message'] ?? 'Unknown error';
                if ($errorCode == 10 || strpos($errorMsg, 'permission') !== false) {
                    error_log("Image insights not available for $mediaId (permission required, HTTP $httpCode): $errorMsg");
                } else {
                    error_log("HTTP $httpCode error fetching image insights for $mediaId (Code $errorCode): $errorMsg");
                }
            }
        }
        
        // Map views to impressions for backward compatibility (if needed)
        $insights['impressions'] = $insights['views'];
        
        return $insights;
    }
    
    /**
     * Get views for images and carousels using the 'views' metric (LEGACY - use getImageInsightsBatch instead)
     */
    private function getImageViews($mediaId) {
        $url = "https://graph.facebook.com/v19.0/{$mediaId}/insights";
        
        $params = [
            'metric' => 'views',
            'period' => 'lifetime',
            'access_token' => $this->accessToken
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 3);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        unset($ch);
        
        if ($httpCode === 200) {
            $data = json_decode($response, true);
            
            if (isset($data['data'][0]['values'][0]['value'])) {
                return $data['data'][0]['values'][0]['value'];
            }
        }
        
        return 0;
    }
    
    /**
     * Get reach for any media (fallback method)
     */
    private function getMediaReach($mediaId) {
        $url = "https://graph.facebook.com/v19.0/{$mediaId}/insights";
        
        $params = [
            'metric' => 'reach',
            'period' => 'lifetime',
            'access_token' => $this->accessToken
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 3);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        unset($ch);
        
        if ($httpCode === 200) {
            $data = json_decode($response, true);
            
            if (isset($data['data'][0]['values'][0]['value'])) {
                return $data['data'][0]['values'][0]['value'];
            }
        }
        
        return 0;
    }
    
    private function getPostInsights($mediaId) {
        $url = "https://graph.facebook.com/v19.0/{$mediaId}/insights";
        
        // Use 'views' instead of deprecated 'impressions', and 'total_interactions' instead of 'engagement'
        $params = [
            'metric' => 'views,reach,saved,total_interactions',
            'period' => 'lifetime',
            'access_token' => $this->accessToken
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        unset($ch);
        
        if ($httpCode !== 200) {
            return [
                'reach' => 0,
                'impressions' => 0,
                'saved' => 0,
                'video_views' => 0
            ];
        }
        
        $data = json_decode($response, true);
        $insights = [];
        
        if (isset($data['data']) && is_array($data['data'])) {
            foreach ($data['data'] as $metric) {
                $metricName = $metric['name'];
                $value = $metric['values'][0]['value'] ?? 0;
                $insights[$metricName] = $value;
            }
        }
        
        // Map 'views' to 'impressions' for backward compatibility
        $impressions = $insights['views'] ?? 0;
        
        return [
            'reach' => $insights['reach'] ?? 0,
            'impressions' => $impressions,
            'saved' => $insights['saved'] ?? 0,
            'video_views' => $impressions // Use views as video_views for consistency
        ];
    }

    private function getAccountLevelInsights($accountId, $startDate, $endDate) {
        // Updated to use v19.0 API and fetch multiple metrics efficiently
        // Valid metrics for Instagram Business accounts in v19.0+ (as per API error message)
        // NOTE: 'impressions' is NOT valid for account-level insights in v19.0+
        // Some metrics require metric_type=total_value parameter
        
        // Metrics that work without metric_type
        $simpleMetrics = [
            'reach',
            'website_clicks',
            'follower_count',
            'views' // Account-level views metric
        ];
        
        // Metrics that require metric_type=total_value
        $totalValueMetrics = [
            'profile_views',
            'accounts_engaged',
            'total_interactions'
        ];
        
        $insights = [];
        
        // Convert dates to Unix timestamps
        $sinceUnix = strtotime($startDate);
        $untilUnix = strtotime($endDate);
        
        if ($sinceUnix === false || $untilUnix === false) {
            error_log("Invalid date format: startDate=$startDate, endDate=$endDate");
            return [];
        }
        
        $url = "https://graph.facebook.com/v19.0/{$accountId}/insights";
        
        // Method 1: Fetch simple metrics (without metric_type)
        if (!empty($simpleMetrics)) {
            try {
                $params = [
                    'metric' => implode(',', $simpleMetrics),
                    'period' => 'day',
                    'since' => $sinceUnix,
                    'until' => $untilUnix,
                    'access_token' => $this->accessToken
                ];
        
                error_log("Fetching Instagram simple metrics for account $accountId (date range: $startDate to $endDate)");
                $data = $this->makeCurlRequest($url, $params, 30);
                
                // Process the response
                if (isset($data['data']) && is_array($data['data'])) {
                    foreach ($data['data'] as $metricData) {
                        $metricName = $metricData['name'] ?? '';
                        $values = $metricData['values'] ?? [];
                        
                        // Sum all values for the period
                        $total = 0;
                        foreach ($values as $value) {
                            $total += $value['value'] ?? 0;
                        }
                        
                        if ($total > 0 || count($values) > 0) {
                            $insights[$metricName] = $total;
                            error_log("Instagram metric '$metricName': total=$total (from " . count($values) . " data points)");
                        }
                    }
                }
            } catch (Exception $e) {
                error_log("Simple metrics fetch failed: " . $e->getMessage());
            }
        }
        
        // Method 2: Fetch metrics that require metric_type=total_value
        if (!empty($totalValueMetrics)) {
            foreach ($totalValueMetrics as $metric) {
                try {
                    $params = [
                        'metric' => $metric,
                        'metric_type' => 'total_value',
                        'period' => 'day',
                        'since' => $sinceUnix,
                        'until' => $untilUnix,
                        'access_token' => $this->accessToken
                    ];
                    
                    error_log("Fetching Instagram metric '$metric' with metric_type=total_value");
                    $metricData = $this->makeCurlRequest($url, $params, 10);
                    
                    if (isset($metricData['data'][0]['values'])) {
                        $values = $metricData['data'][0]['values'];
                        $total = 0;
                        foreach ($values as $value) {
                            $total += $value['value'] ?? 0;
                        }
                        
                        if ($total > 0 || count($values) > 0) {
                            $insights[$metric] = $total;
                            error_log("Instagram metric '$metric': total=$total (from " . count($values) . " data points)");
                        }
                    }
                } catch (Exception $metricError) {
                    error_log("Instagram metric '$metric' failed: " . $metricError->getMessage());
                    // Continue to next metric - don't throw exception
                    continue;
                }
            }
        }
        
        // If all metrics are zero, try expanding date range
        $allZero = true;
        foreach ($insights as $val) {
            if ($val > 0) {
                $allZero = false;
                break;
            }
        }
        
        if ($allZero && count($insights) > 0) {
            error_log("All metrics are zero. Trying expanded date range (last 90 days)...");
            // Try last 90 days as fallback
            $since90 = strtotime('-90 days');
            $until90 = strtotime('now');
            
            try {
                $params90 = [
                    'metric' => 'reach',
                    'period' => 'day',
                    'since' => $since90,
                    'until' => $until90,
                    'access_token' => $this->accessToken
                ];
                $data90 = $this->makeCurlRequest($url, $params90, 30);
                
                if (isset($data90['data']) && is_array($data90['data'])) {
                    foreach ($data90['data'] as $metricData) {
                        $metricName = $metricData['name'] ?? '';
                        $values = $metricData['values'] ?? [];
                        $total = 0;
                        foreach ($values as $value) {
                            $total += $value['value'] ?? 0;
                        }
                        if ($total > 0 && (!isset($insights[$metricName]) || $insights[$metricName] == 0)) {
                            $insights[$metricName] = $total;
                            error_log("Got data for '$metricName' from expanded date range: $total");
                        }
                    }
                }
            } catch (Exception $e90) {
                error_log("Expanded date range also failed: " . $e90->getMessage());
            }
        }
        
        error_log("Available Instagram insights: " . json_encode(array_keys($insights)));
        error_log("Insights summary: " . json_encode($insights));
        
        // Calculate impressions from reach (if available) or use 0
        // Note: impressions is not available as a direct metric in v19.0 for account-level insights
        // We can approximate it from reach (typically 1.2-1.5x reach)
        $impressions = 0;
        if (isset($insights['reach']) && $insights['reach'] > 0) {
            // Rough approximation: impressions is usually 1.2-1.5x reach
            $impressions = (int)($insights['reach'] * 1.3);
        }
        
        // Return insights with proper defaults (0 instead of null for better frontend handling)
        return [
            'reach' => $insights['reach'] ?? 0, // Use 0 instead of null
            'impressions' => $impressions, // Calculated approximation or 0
            'profile_visits' => $insights['profile_views'] ?? 0, // Map profile_views to profile_visits, use 0 instead of null
            'website_clicks' => $insights['website_clicks'] ?? 0, // Use 0 instead of null
            'email_contacts' => null, // Not available in v19.0
            'get_directions_clicks' => null, // Not available in v19.0
            'phone_call_clicks' => null, // Not available in v19.0
            'text_message_clicks' => null, // Not available in v19.0
            'accounts_engaged' => $insights['accounts_engaged'] ?? 0, // Use 0 instead of null
            'total_interactions' => $insights['total_interactions'] ?? 0 // Use 0 instead of null
        ];
    }
    
    private function getMediaInsights($media) {
        $totalReach = 0;
        $totalImpressions = 0;
        $count = 0;
        
        // Get insights for each media item
        foreach ($media as $post) {
            $mediaId = $post['id'] ?? null;
            if (!$mediaId) continue;
            
            $url = "https://graph.facebook.com/v19.0/{$mediaId}/insights";
            
            // Use 'views' instead of deprecated 'impressions' (v22.0+)
            $params = [
                'metric' => 'views,reach',
                'period' => 'lifetime',
                'access_token' => $this->accessToken
            ];
            
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            
            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            unset($ch);
            
            if ($httpCode === 200) {
                $data = json_decode($response, true);
                
                if (isset($data['data']) && is_array($data['data'])) {
                    foreach ($data['data'] as $metric) {
                        $metricName = $metric['name'];
                        $value = $metric['values'][0]['value'] ?? 0;
                        
                        if ($metricName === 'views') {
                            // Map views to impressions for backward compatibility
                            $totalImpressions += $value;
                        } elseif ($metricName === 'reach') {
                            $totalReach += $value;
                        }
                    }
                    $count++;
                }
            }
            
            // Limit to avoid rate limiting (only check recent 10 posts)
            if ($count >= 10) break;
        }
        
        return [
            'reach' => $totalReach,
            'impressions' => $totalImpressions
        ];
    }

    private function getLatestValue($values) {
        return !empty($values) ? end($values)['value'] : 0;
    }

    private function sumValues($values) {
        return array_sum(array_column($values, 'value'));
    }
    
    /**
     * Get recent stories from Instagram account
     * Note: Instagram API only returns active stories (stories currently live)
     * Stories expire after 24 hours and are no longer accessible via API
     */
    public function getRecentStories($accountId) {
        $url = "https://graph.facebook.com/v19.0/{$accountId}/stories";
        
        $params = [
            'fields' => 'id,media_type,media_url,thumbnail_url,permalink,timestamp',
            'access_token' => $this->accessToken
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        unset($ch);
        
        if ($curlError) {
            error_log("CURL error fetching stories for account $accountId: " . $curlError);
            return [];
        }
        
        if ($httpCode !== 200) {
            $errorResponse = substr($response, 0, 500);
            error_log("HTTP $httpCode error fetching stories for account $accountId. Response: " . $errorResponse);
            
            $data = json_decode($response, true);
            if (isset($data['error'])) {
                $errorMsg = $data['error']['message'] ?? 'Unknown error';
                error_log("Stories API error: " . $errorMsg);
            }
            return [];
        }
        
        $data = json_decode($response, true);
        $stories = $data['data'] ?? [];
        
        error_log("Fetched " . count($stories) . " active stories for account $accountId");
        error_log("Note: Only active stories (currently live) are returned. Stories expire after 24 hours.");
        
        return $stories;
    }
    
    /**
     * Safe wrapper for getTopStories - returns empty array on error
     */
    private function getTopStoriesSafe($stories) {
        try {
            return $this->getTopStories($stories);
        } catch (Exception $e) {
            error_log("Error getting top stories (non-critical): " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Safe wrapper for getAllStoriesWithMetrics - returns empty array on error
     */
    private function getAllStoriesWithMetricsSafe($stories, $startDate = null, $endDate = null) {
        try {
            return $this->getAllStoriesWithMetrics($stories, $startDate, $endDate);
        } catch (Exception $e) {
            error_log("Error getting stories with metrics (non-critical): " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Get top stories by engagement
     */
    private function getTopStories($stories) {
        if (empty($stories)) {
            return [];
        }
        
        $storiesWithMetrics = [];
        
        foreach ($stories as $story) {
            // Try to get story insights
            $insights = $this->getStoryInsights($story['id']);
            
            $storiesWithMetrics[] = [
                'id' => $story['id'],
                'media_type' => $story['media_type'] ?? 'IMAGE',
                'media_url' => $story['media_url'] ?? '',
                'thumbnail_url' => $story['thumbnail_url'] ?? $story['media_url'] ?? '',
                'permalink' => $story['permalink'] ?? '',
                'timestamp' => $story['timestamp'] ?? '',
                'impressions' => $insights['impressions'] ?? 0,
                'reach' => $insights['reach'] ?? 0,
                'replies' => $insights['replies'] ?? 0,
                'engagement' => ($insights['impressions'] ?? 0) + ($insights['replies'] ?? 0)
            ];
        }
        
        // Sort by engagement
        usort($storiesWithMetrics, function($a, $b) {
            return $b['engagement'] - $a['engagement'];
        });
        
        return array_slice($storiesWithMetrics, 0, 5);
    }
    
    /**
     * Get comprehensive story insights including all KPIs
     */
    private function getStoryInsights($storyId) {
        $url = "https://graph.facebook.com/v19.0/{$storyId}/insights";
        
        // Fetch all available story metrics
        // Note: Story insights may not be available if story has < 5 views or is too new
        $params = [
            'metric' => 'impressions,reach,replies,taps_forward,taps_back,exits',
            'access_token' => $this->accessToken
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        unset($ch);
        
        if ($curlError) {
            error_log("CURL error fetching story insights for $storyId: " . $curlError);
            return [];
        }
        
        if ($httpCode !== 200) {
            $errorResponse = substr($response, 0, 500);
            error_log("HTTP $httpCode error fetching story insights for $storyId. Response: " . $errorResponse);
            
            // Check if it's a specific error we can handle
            $data = json_decode($response, true);
            if (isset($data['error'])) {
                $errorCode = $data['error']['code'] ?? 'Unknown';
                $errorMsg = $data['error']['message'] ?? 'Unknown error';
                error_log("Story insights API error (Code $errorCode): $errorMsg");
                
                // Some stories may not have insights available (too new, < 5 views, etc.)
                if ($errorCode == 100 || strpos($errorMsg, 'insights') !== false) {
                    error_log("Story $storyId: Insights not available (story may be too new or have insufficient views)");
                }
            }
            return [];
        }
        
        $data = json_decode($response, true);
        $insights = [];
        
        // Check for API errors in response
        if (isset($data['error'])) {
            $errorCode = $data['error']['code'] ?? 'Unknown';
            $errorMsg = $data['error']['message'] ?? 'Unknown error';
            error_log("API error fetching story insights for $storyId (Code $errorCode): $errorMsg");
            return [];
        }
        
        if (isset($data['data']) && is_array($data['data']) && !empty($data['data'])) {
            foreach ($data['data'] as $metric) {
                $metricName = $metric['name'];
                // Get the value - insights may have different structures
                if (isset($metric['values']) && is_array($metric['values']) && !empty($metric['values'])) {
                    $value = $metric['values'][0]['value'] ?? 0;
                } else {
                    $value = $metric['value'] ?? 0;
                }
                $insights[$metricName] = $value;
                error_log("Story $storyId - $metricName: $value");
            }
        } else {
            error_log("Story $storyId: No insights data returned. Response structure: " . json_encode($data));
        }
        
        // Try to get link clicks separately (if story has a link)
        $linkClicks = $this->getStoryLinkClicks($storyId);
        if ($linkClicks > 0) {
            $insights['link_clicks'] = $linkClicks;
            error_log("Story $storyId - link_clicks: $linkClicks");
        }
        
        return $insights;
    }
    
    /**
     * Get link clicks for a story (if it has a link)
     */
    private function getStoryLinkClicks($storyId) {
        $url = "https://graph.facebook.com/v19.0/{$storyId}/insights";
        
        $params = [
            'metric' => 'link_clicks',
            'access_token' => $this->accessToken
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 3);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        unset($ch);
        
        if ($httpCode === 200) {
            $data = json_decode($response, true);
            if (isset($data['data'][0]['values'][0]['value'])) {
                return $data['data'][0]['values'][0]['value'];
            }
        }
        
        return 0; // No link clicks or metric not available
    }
    
    /**
     * Get follower growth (new followers) in date range
     */
    private function getFollowerGrowth($accountId, $startDate, $endDate) {
        $url = "https://graph.facebook.com/v19.0/{$accountId}/insights";
        
        $params = [
            'metric' => 'follower_count',
            'period' => 'day',
            'since' => strtotime($startDate),
            'until' => strtotime($endDate),
            'access_token' => $this->accessToken
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 10);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
        curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, 0);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        unset($ch);
        
        if ($httpCode !== 200) {
            error_log("Follower growth API failed (HTTP $httpCode): " . $response);
            // Return null to indicate data not available
            return ['new_followers' => null, 'follower_data_available' => false];
        }
        
        $data = json_decode($response, true);
        
        // Log the response for debugging
        error_log("Follower growth response: " . json_encode($data));
        
        if (isset($data['data'][0]['values']) && count($data['data'][0]['values']) >= 2) {
            $values = $data['data'][0]['values'];
            $firstValue = $values[0]['value'] ?? 0;
            $lastValue = end($values)['value'] ?? 0;
            $newFollowers = $lastValue - $firstValue;
            
            error_log("Follower growth calculated: First=$firstValue, Last=$lastValue, New=$newFollowers");
            
            return ['new_followers' => max(0, $newFollowers), 'follower_data_available' => true];
        }
        
        // If API doesn't return follower_count data, return null
        error_log("Follower count metric not available in API response");
        return ['new_followers' => null, 'follower_data_available' => false];
    }
    
    /**
     * Get all stories with comprehensive metrics (filtered by date range)
     */
    public function getAllStoriesWithMetrics($stories, $startDate = null, $endDate = null) {
        if (empty($stories)) {
            return [];
        }
        
        $storiesWithMetrics = [];
        
        foreach ($stories as $story) {
            // Filter by date range if provided
            if ($startDate && $endDate && isset($story['timestamp'])) {
                $storyDate = date('Y-m-d', strtotime($story['timestamp']));
                if ($storyDate < $startDate || $storyDate > $endDate) {
                    continue; // Skip stories outside date range
                }
            }
            
            // Get comprehensive story insights
            // Note: Insights may not be available immediately or if story has < 5 views
            $insights = $this->getStoryInsights($story['id']);
            
            $impressions = $insights['impressions'] ?? 0;
            $reach = $insights['reach'] ?? 0;
            $replies = $insights['replies'] ?? 0;
            $tapsForward = $insights['taps_forward'] ?? 0;
            $tapsBack = $insights['taps_back'] ?? 0;
            $exits = $insights['exits'] ?? 0;
            $linkClicks = $insights['link_clicks'] ?? 0;
            
            // Log if insights are missing
            if (empty($insights)) {
                error_log("Warning: No insights available for story {$story['id']} (may be too new or have < 5 views)");
            }
            
            // Calculate engagement (interactions)
            $engagement = $replies + $tapsForward + $tapsBack;
            
            $storiesWithMetrics[] = [
                'id' => $story['id'],
                'media_type' => $story['media_type'] ?? 'IMAGE',
                'media_url' => $story['media_url'] ?? '',
                'thumbnail_url' => $story['thumbnail_url'] ?? $story['media_url'] ?? '',
                'permalink' => $story['permalink'] ?? '',
                'timestamp' => $story['timestamp'] ?? '',
                'impressions' => $impressions,
                'reach' => $reach,
                'replies' => $replies,
                'taps_forward' => $tapsForward,
                'taps_back' => $tapsBack,
                'exits' => $exits,
                'link_clicks' => $linkClicks,
                'web_clicks' => $linkClicks, // Alias for web clicks
                'engagement' => $engagement,
                'completion_rate' => $impressions > 0 ? round((($impressions - $exits) / $impressions) * 100, 2) : 0
            ];
        }
        
        // Sort by impressions (descending) - most viewed first
        usort($storiesWithMetrics, function($a, $b) {
            return $b['impressions'] - $a['impressions'];
        });
        
        return $storiesWithMetrics;
    }
}
?>
