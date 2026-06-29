<?php
/**
 * Unified Organic Report API
 * Combines: Account Stats + Content Performance + Stories Performance
 * Supports both Instagram and Facebook
 */

set_time_limit(180); // 3 minutes for comprehensive report
ini_set('max_execution_time', 180);

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../services/FacebookService.php';
require_once __DIR__ . '/../services/InstagramService.php';
require_once __DIR__ . '/../utils/crypto.php';

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

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $accountId = $input['accountId'] ?? '';
        $startDate = $input['startDate'] ?? date('Y-m-d', strtotime('-30 days'));
        $endDate = $input['endDate'] ?? date('Y-m-d');
        $includePosts = $input['includePosts'] ?? true;
        $includeStories = $input['includeStories'] ?? true;
        $postsLimit = $input['postsLimit'] ?? 25;
        
        if (empty($accountId)) {
            throw new Exception('Account ID required');
        }
        
        // Get account from database
        $db = new Database();
        $conn = $db->getConnection();
        
        $stmt = $conn->prepare("SELECT * FROM accounts WHERE id = ?");
        $stmt->execute([$accountId]);
        $account = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$account) {
            throw new Exception('Account not found');
        }
        
        if (empty($account['access_token'])) {
            throw new Exception('Access token is missing for this account');
        }
        
        $accessToken = decryptToken($account['access_token']);
        if (empty($accessToken)) {
            throw new Exception('Access token could not be decrypted');
        }
        
        $platform = strtolower($account['platform']);
        // Initialize report with default structure to ensure it's never null
        $report = [
            'account' => [
                'id' => $account['id'],
                'account_id' => $account['account_id'],
                'account_name' => $account['account_name'],
                'platform' => $platform,
                'username' => $account['username'] ?? null,
            ],
            'date_range' => [
                'start' => $startDate,
                'end' => $endDate
            ],
            'account_stats' => [
                'followers' => $account['followers_count'] ?? 0,
                'following' => 0,
                'posts_count' => 0,
                'profile_views' => 0,
                'website_clicks' => 0,
                'email_clicks' => 0,
            ],
            'engagement' => [
                'impressions' => 0,
                'reach' => 0,
                'total_engagement' => 0,
                'likes' => 0,
                'comments' => 0,
                'shares' => 0,
                'saves' => 0,
                'engagement_rate' => 0,
            ],
            'content_posts' => [],
            'stories' => [
                'total_posted' => 0,
                'total_views' => 0,
                'total_replies' => 0,
                'avg_views' => 0,
                'stories_list' => []
            ],
            'growth' => [
                'followers_growth' => 0,
                'engagement_growth' => 0,
                'reach_growth' => 0,
            ]
        ];
        
        error_log("Generating unified organic report for: {$account['account_name']} ({$platform})");
        
        // 1. ACCOUNT STATS & ENGAGEMENT METRICS
        try {
            if ($platform === 'instagram') {
                $service = new InstagramService($accessToken);
                $insights = $service->getAccountInsights($account['account_id'], $startDate, $endDate);
                
                if (empty($insights) || !isset($insights['organic'])) {
                    error_log("Warning: getAccountInsights returned empty or invalid data for account {$account['account_id']}");
                    // Try to get at least basic account info
                    try {
                        $accountInfo = $service->getAccountInfo($account['account_id']);
                        $report['account_stats']['followers'] = $accountInfo['followers_count'] ?? 0;
                        error_log("Got basic account info: followers=" . ($accountInfo['followers_count'] ?? 0));
                    } catch (Exception $infoError) {
                        error_log("Could not get basic account info: " . $infoError->getMessage());
                    }
                } else {
                    $organic = $insights['organic'] ?? [];
                    
                    // Account Stats
                    $report['account_stats'] = [
                        'followers' => $organic['followers'] ?? $organic['followers_count'] ?? $account['followers_count'] ?? 0,
                        'following' => $organic['following'] ?? 0,
                        'posts_count' => $organic['posts_count'] ?? 0,
                        'profile_views' => $organic['profile_visits'] ?? $organic['profile_views'] ?? 0,
                        'website_clicks' => $organic['website_clicks'] ?? 0,
                        'email_clicks' => $organic['email_clicks'] ?? 0,
                    ];
                    
                    // Engagement Metrics
                    $report['engagement'] = [
                        'impressions' => $organic['impressions'] ?? ($organic['reach'] ? round($organic['reach'] * 1.3) : 0) ?? ($organic['total_views'] ?? 0),
                        'reach' => $organic['reach'] ?? 0,
                        'total_engagement' => $organic['total_engagement'] ?? $organic['engaged_users'] ?? $organic['engagement'] ?? 0,
                        'likes' => $organic['total_likes'] ?? $organic['likes'] ?? 0,
                        'comments' => $organic['total_comments'] ?? $organic['comments'] ?? 0,
                        'shares' => $organic['shares'] ?? 0,
                        'saves' => $organic['saves'] ?? 0,
                        'engagement_rate' => $organic['engagement_rate'] ?? 0,
                    ];
                }
                
            } elseif ($platform === 'facebook') {
                $service = new FacebookService($accessToken);
                $stats = $service->getPageStats($account['account_id'], strtotime($startDate), strtotime($endDate));
                
                $organic = $stats['organic'] ?? [];
                
                // Account Stats
                $report['account_stats'] = [
                    'followers' => $organic['followers'] ?? $organic['fan_count'] ?? $account['followers_count'] ?? 0,
                    'following' => 0, // Not applicable for Facebook Pages
                    'posts_count' => $organic['posts_count'] ?? 0,
                    'profile_views' => $organic['page_views'] ?? 0,
                    'website_clicks' => $organic['website_clicks'] ?? 0,
                    'email_clicks' => 0,
                ];
                
                // Engagement Metrics
                $report['engagement'] = [
                    'impressions' => $organic['impressions'] ?? 0,
                    'reach' => $organic['reach'] ?? 0,
                    'total_engagement' => $organic['post_engagements'] ?? $organic['total_engagement'] ?? 0,
                    'likes' => $organic['likes'] ?? $organic['reactions'] ?? 0,
                    'comments' => $organic['comments'] ?? 0,
                    'shares' => $organic['shares'] ?? 0,
                    'saves' => 0, // Not available for Facebook
                    'engagement_rate' => $organic['engagement_rate'] ?? 0,
                ];
            }
        } catch (Exception $e) {
            error_log("Error fetching account insights for {$account['account_name']}: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            // Continue with default stats - don't fail the whole report
            // But ensure report structure is still valid
        }
        
        // 2. CONTENT POSTS
        if ($includePosts) {
            try {
                if ($platform === 'instagram') {
                    $service = new InstagramService($accessToken);
                    
                    // Get account info for follower count (needed for engagement rate)
                    $accountInfo = $service->getAccountInfo($account['account_id']);
                    $followersCount = $accountInfo['followers_count'] ?? $report['account_stats']['followers'] ?? 0;
                    
                    // Get posts
                    $posts = $service->getDetailedPostsReport($account['account_id'], $followersCount, $postsLimit);
                    
                    // Filter by date range - handle both timestamp and created_time formats
                    $filteredPosts = array_filter($posts, function($post) use ($startDate, $endDate) {
                        $dateStr = $post['timestamp'] ?? $post['created_time'] ?? null;
                        if (!$dateStr) return false;
                        $postDate = date('Y-m-d', strtotime($dateStr));
                        return $postDate >= $startDate && $postDate <= $endDate;
                    });
                    
                    $report['content_posts'] = array_values($filteredPosts);
                    
                } elseif ($platform === 'facebook') {
                    $service = new FacebookService($accessToken);
                    $posts = $service->getDetailedPostsReport($account['account_id'], $report['account_stats']['followers'], $postsLimit);
                    
                    // Filter by date range - handle both timestamp and created_time formats
                    $filteredPosts = array_filter($posts, function($post) use ($startDate, $endDate) {
                        $dateStr = $post['timestamp'] ?? $post['created_time'] ?? null;
                        if (!$dateStr) return false;
                        $postDate = date('Y-m-d', strtotime($dateStr));
                        return $postDate >= $startDate && $postDate <= $endDate;
                    });
                    
                    $report['content_posts'] = array_values($filteredPosts);
                }
                
                error_log("Fetched " . count($report['content_posts']) . " posts for date range");
                
            } catch (Exception $e) {
                error_log("Error fetching posts (non-critical): " . $e->getMessage());
                // Continue with empty posts array
                $report['content_posts'] = [];
            }
        }
        
        // 3. STORIES (Instagram only for now)
        if ($includeStories && $platform === 'instagram') {
            try {
                $service = new InstagramService($accessToken);
                
                // Get recent stories
                $stories = $service->getRecentStories($account['account_id']);
                
                if (!empty($stories)) {
                    // Get stories with metrics, filtered by date range
                    $storiesWithMetrics = $service->getAllStoriesWithMetrics($stories, $startDate, $endDate);
                    
                    $report['stories'] = [
                        'total_posted' => count($storiesWithMetrics),
                        'total_views' => array_sum(array_column($storiesWithMetrics, 'impressions')),
                        'total_replies' => array_sum(array_column($storiesWithMetrics, 'replies')),
                        'avg_views' => count($storiesWithMetrics) > 0 ? round(array_sum(array_column($storiesWithMetrics, 'impressions')) / count($storiesWithMetrics)) : 0,
                        'stories_list' => $storiesWithMetrics
                    ];
                    
                    error_log("Fetched " . count($storiesWithMetrics) . " stories for date range");
                } else {
                    $report['stories'] = [
                        'total_posted' => 0,
                        'total_views' => 0,
                        'total_replies' => 0,
                        'avg_views' => 0,
                        'stories_list' => []
                    ];
                }
                
            } catch (Exception $e) {
                error_log("Error fetching stories (non-critical): " . $e->getMessage());
                $report['stories'] = [
                    'total_posted' => 0,
                    'total_views' => 0,
                    'total_replies' => 0,
                    'avg_views' => 0,
                    'stories_list' => []
                ];
            }
        } else {
            // Facebook or stories disabled
            $report['stories'] = [
                'total_posted' => 0,
                'total_views' => 0,
                'total_replies' => 0,
                'avg_views' => 0,
                'stories_list' => []
            ];
        }
        
        // 4. CALCULATE GROWTH (if previous period data available)
        // This would require storing historical data - for now return empty
        $report['growth'] = [
            'followers_growth' => 0,
            'engagement_growth' => 0,
            'reach_growth' => 0,
        ];
        
        // Ensure report structure is always valid and not null
        if (empty($report) || !is_array($report)) {
            error_log("CRITICAL: Report structure is empty or invalid for account {$account['account_name']}");
            // Re-initialize with minimal structure
            $report = [
                'account' => [
                    'id' => $account['id'],
                    'account_id' => $account['account_id'],
                    'account_name' => $account['account_name'],
                    'platform' => $platform,
                ],
                'date_range' => [
                    'start' => $startDate,
                    'end' => $endDate
                ],
                'account_stats' => [],
                'engagement' => [],
                'content_posts' => [],
                'stories' => [
                    'total_posted' => 0,
                    'total_views' => 0,
                    'total_replies' => 0,
                    'avg_views' => 0,
                    'stories_list' => []
                ],
                'growth' => [
                    'followers_growth' => 0,
                    'engagement_growth' => 0,
                    'reach_growth' => 0,
                ]
            ];
        }
        
        echo json_encode([
            'success' => true,
            'data' => $report
        ], JSON_UNESCAPED_UNICODE);
        
    } catch (Exception $e) {
        http_response_code(500);
        error_log("Error in organic_report.php: " . $e->getMessage());
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
    exit;
}

// GET method - return error or allow fetching by account ID
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'error' => 'GET method not supported. Use POST with accountId, startDate, endDate'
    ]);
    exit;
}

