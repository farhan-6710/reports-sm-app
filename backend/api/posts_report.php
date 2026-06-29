<?php
/**
 * Posts Performance Report API
 * Detailed table of all posts with metrics
 */

// Increase execution time for fetching posts with insights
set_time_limit(120); // 2 minutes
ini_set('max_execution_time', 120);

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../services/InstagramService.php';
require_once __DIR__ . '/../services/FacebookService.php';
require_once __DIR__ . '/../utils/crypto.php';

// CORS Headers - MUST be set before any output
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Access-Control-Max-Age: 3600");

// Handle OPTIONS preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

header('Content-Type: application/json');

$method = $_SERVER['REQUEST_METHOD'];

// Get detailed posts report
if ($method === 'POST') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $accountId = $input['accountId'] ?? '';
        $platform = $input['platform'] ?? 'instagram';
        $limit = $input['limit'] ?? 10; // Reduced default from 25 to 10 for faster loading
        $startDate = $input['startDate'] ?? date('Y-m-d', strtotime('-30 days'));
        $endDate = $input['endDate'] ?? date('Y-m-d');
        
        if (empty($accountId)) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Account ID required']);
            exit;
        }
        
        // Get account from database
        try {
            $db = new Database();
            $conn = $db->getConnection();
            
            $stmt = $conn->prepare("SELECT * FROM accounts WHERE id = ?");
            $stmt->execute([$accountId]);
            $account = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$account) {
                http_response_code(404);
                echo json_encode(['success' => false, 'error' => 'Account not found']);
                exit;
            }
        } catch (Exception $dbError) {
            error_log("Database error in posts_report: " . $dbError->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Database error: ' . $dbError->getMessage()]);
            exit;
        }

        // Decrypt access token
        try {
            $accessToken = decryptToken($account['access_token']);
            if (empty($accessToken)) {
                throw new Exception('Access token is empty or could not be decrypted');
            }
        } catch (Exception $tokenError) {
            error_log("Token decryption error: " . $tokenError->getMessage());
            http_response_code(500);
            echo json_encode(['success' => false, 'error' => 'Token error: ' . $tokenError->getMessage()]);
            exit;
        }
        
        $posts = [];
        $filteredPosts = []; // Initialize to prevent undefined variable errors
        $stories = []; // Initialize to prevent undefined variable errors
        
        if ($platform === 'instagram' || $account['platform'] === 'instagram') {
            error_log("Fetching posts for Instagram account: " . $account['account_id']);
            
            $service = new InstagramService($accessToken);
            
            // Get account followers for engagement rate calculation
            // Use getAccountInfo directly (simpler and more reliable)
            try {
                $basicInfo = $service->getAccountInfo($account['account_id']);
                $followers = $basicInfo['followers_count'] ?? 0;
                error_log("Got followers count: $followers");
            } catch (Exception $e) {
                $errorMessage = $e->getMessage();
                error_log("Failed to get account info, using fallback: " . $errorMessage);
                $followers = 0;
            }
            
            // Get detailed posts - this may also fail with permission errors, but should still return basic post data
            error_log("Fetching detailed posts report for date range: $startDate to $endDate");
            try {
                $posts = $service->getDetailedPostsReport($account['account_id'], $followers, $limit);
            } catch (Exception $e) {
                $errorMessage = $e->getMessage();
                // If it's a permission error for posts, try to get basic posts without insights
                if (strpos($errorMessage, 'permission') !== false || strpos($errorMessage, '(#10)') !== false) {
                    error_log("Permission error getting detailed posts - attempting to get basic posts only");
                    // Try to get basic posts (without insights metrics)
                    try {
                        $basicMedia = $service->getRecentMedia($account['account_id'], $limit);
                        // Convert to basic post format
                        $posts = [];
                        foreach ($basicMedia as $post) {
                            $posts[] = [
                                'id' => $post['id'],
                                'caption' => $post['caption'] ?? '',
                                'media_type' => $post['media_type'] ?? 'IMAGE',
                                'media_url' => $post['media_url'] ?? '',
                                'thumbnail_url' => $post['thumbnail_url'] ?? $post['media_url'] ?? '',
                                'permalink' => $post['permalink'] ?? '',
                                'timestamp' => $post['timestamp'] ?? '',
                                'likes' => $post['like_count'] ?? 0,
                                'comments' => $post['comments_count'] ?? 0,
                                'engagement' => ($post['like_count'] ?? 0) + ($post['comments_count'] ?? 0),
                                'engagement_rate' => $followers > 0 ? round((($post['like_count'] ?? 0) + ($post['comments_count'] ?? 0)) / $followers * 100, 2) : 0,
                                'views' => 0, // Not available without permissions
                                'impressions' => 0,
                                'reach' => 0,
                                'saved' => 0,
                                'shares' => 0
                            ];
                        }
                        error_log("Got basic posts data (without insights): " . count($posts) . " posts");
                    } catch (Exception $e2) {
                        error_log("Could not get basic posts either: " . $e2->getMessage());
                        // Re-throw the original permission error
                        throw new Exception("Instagram API Error: (#10) Application does not have permission for this action. Please regenerate token with pages_read_engagement, instagram_basic, and instagram_manage_insights permissions.");
                    }
                } else {
                    // Re-throw non-permission errors
                    throw $e;
                }
            }
            
            // Filter posts by date range
            $filteredPosts = array_filter($posts, function($post) use ($startDate, $endDate) {
                $postDate = date('Y-m-d', strtotime($post['timestamp']));
                return $postDate >= $startDate && $postDate <= $endDate;
            });
            
            // Re-index array after filtering
            $filteredPosts = array_values($filteredPosts);
            
            error_log("Successfully fetched " . count($filteredPosts) . " posts in date range (from " . count($posts) . " total)");
            
            // Get stories for the date range
            // First try to get from archive (stored stories), then fallback to active stories
            try {
                error_log("Fetching stories for date range: $startDate to $endDate");
                
                // Try to get stories from archive database first
                $db = new Database();
                $conn = $db->getConnection();
                $archiveStmt = $conn->prepare("
                    SELECT * FROM instagram_stories_archive 
                    WHERE account_id = ? 
                    AND DATE(timestamp) >= ? 
                    AND DATE(timestamp) <= ?
                    ORDER BY timestamp DESC
                ");
                $archiveStmt->execute([$account['account_id'], $startDate, $endDate]);
                $archivedStories = $archiveStmt->fetchAll(PDO::FETCH_ASSOC);
                
                if (!empty($archivedStories)) {
                    error_log("Found " . count($archivedStories) . " archived stories in database");
                    // Convert archived stories to the expected format
                    foreach ($archivedStories as $archived) {
                        $insightsData = json_decode($archived['insights_data'], true) ?? [];
                        $stories[] = [
                            'id' => $archived['story_id'],
                            'media_type' => $archived['media_type'],
                            'media_url' => $archived['media_url'],
                            'thumbnail_url' => $archived['thumbnail_url'],
                            'permalink' => $archived['permalink'],
                            'timestamp' => $archived['timestamp'],
                            'impressions' => $archived['impressions'],
                            'reach' => $archived['reach'],
                            'replies' => $archived['replies'],
                            'taps_forward' => $archived['taps_forward'],
                            'taps_back' => $archived['taps_back'],
                            'exits' => $archived['exits'],
                            'link_clicks' => $archived['link_clicks'],
                            'web_clicks' => $archived['link_clicks'],
                            'engagement' => $archived['engagement'],
                            'completion_rate' => $archived['completion_rate']
                        ];
                    }
                } else {
                    // Fallback: Get active stories from API
                    error_log("No archived stories found, fetching active stories from API");
                    error_log("Note: Only active stories (currently live) are available via Instagram API");
                    $allStories = $service->getRecentStories($account['account_id']);
                    
                    if (!empty($allStories)) {
                        // Filter stories by date range
                        $filteredStories = array_filter($allStories, function($story) use ($startDate, $endDate) {
                            if (!isset($story['timestamp'])) {
                                return false;
                            }
                            $storyDate = date('Y-m-d', strtotime($story['timestamp']));
                            return $storyDate >= $startDate && $storyDate <= $endDate;
                        });
                        
                        // Get stories with comprehensive metrics
                        $stories = $service->getAllStoriesWithMetrics(array_values($filteredStories), $startDate, $endDate);
                        error_log("Successfully fetched " . count($stories) . " active stories in date range");
                        error_log("Note: Story insights may show 0 if story is too new or has < 5 views");
                    } else {
                        error_log("No active stories found. Stories expire after 24 hours and are no longer accessible via API.");
                    }
                }
            } catch (Exception $e) {
                error_log("Error fetching stories (non-critical): " . $e->getMessage());
                error_log("Stack trace: " . $e->getTraceAsString());
                $stories = []; // Continue without stories if there's an error
            }
            
        } elseif ($platform === 'facebook' || $account['platform'] === 'facebook') {
            error_log("Fetching posts for Facebook account: " . $account['account_id']);
            
            $service = new FacebookService($accessToken);
            
            // Get page info for engagement rate calculation
            try {
                // Use getPageInfo method to get basic page info including followers
                $pageInfo = $service->getPageInfo($account['account_id']);
                $followers = $pageInfo['fan_count'] ?? 0;
                error_log("Got followers count: $followers");
            } catch (Exception $e) {
                error_log("Failed to get page info, using fallback: " . $e->getMessage());
                // Fallback: set followers to 0 if we can't get it
                $followers = 0;
            }
            
            // Get detailed posts
            error_log("Fetching detailed posts report for date range: $startDate to $endDate");
            error_log("Facebook Page ID: " . $account['account_id']);
            error_log("Access token length: " . strlen($accessToken));
            
            try {
                $posts = $service->getDetailedPostsReport($account['account_id'], $followers, $limit);
                error_log("Raw posts fetched: " . count($posts));
                
                // Filter posts by date range
                $filteredPosts = array_filter($posts, function($post) use ($startDate, $endDate) {
                    if (empty($post['timestamp'])) {
                        error_log("Post missing timestamp: " . json_encode($post['id'] ?? 'unknown'));
                        return false;
                    }
                    try {
                        $postDate = date('Y-m-d', strtotime($post['timestamp']));
                        $inRange = $postDate >= $startDate && $postDate <= $endDate;
                        if (!$inRange) {
                            error_log("Post date $postDate outside range $startDate to $endDate");
                        }
                        return $inRange;
                    } catch (Exception $e) {
                        error_log("Error parsing post timestamp: " . $e->getMessage());
                        return false;
                    }
                });
                
                // Re-index array after filtering
                $filteredPosts = array_values($filteredPosts);
                
                error_log("Successfully fetched " . count($filteredPosts) . " posts in date range (from " . count($posts) . " total)");
            } catch (Exception $e) {
                error_log("Error fetching Facebook posts: " . $e->getMessage());
                error_log("Stack trace: " . $e->getTraceAsString());
                throw $e; // Re-throw to be caught by outer try-catch
            }
        }
        
        echo json_encode([
            'success' => true,
            'data' => [
                'account_name' => $account['account_name'],
                'platform' => $account['platform'],
                'date_range' => [
                    'start' => $startDate,
                    'end' => $endDate
                ],
                'total_posts' => count($filteredPosts),
                'posts' => $filteredPosts,
                'total_stories' => count($stories),
                'stories' => $stories
            ]
        ]);
        
    } catch (Exception $e) {
        http_response_code(500);
        $errorMessage = $e->getMessage();
        $errorTrace = $e->getTraceAsString();
        
        error_log('Posts report error: ' . $errorMessage);
        error_log('Stack trace: ' . $errorTrace);
        error_log('Account ID: ' . ($accountId ?? 'unknown'));
        error_log('Platform: ' . ($platform ?? 'unknown'));
        
        // Return user-friendly error message
        $userMessage = $errorMessage;
        if (strpos($errorMessage, 'permission') !== false || strpos($errorMessage, '(#10)') !== false) {
            $userMessage = 'Permission error: Token may not have required Instagram permissions. Please regenerate token with instagram_manage_insights permission.';
        } elseif (strpos($errorMessage, 'token') !== false || strpos($errorMessage, 'Access token') !== false) {
            $userMessage = 'Token error: Access token is invalid or expired. Please update the account with a valid token.';
        } elseif (strpos($errorMessage, 'database') !== false || strpos($errorMessage, 'Database') !== false) {
            $userMessage = 'Database error: Could not retrieve account information.';
        } elseif (empty($userMessage) || $userMessage === 'Unknown error') {
            $userMessage = 'Content Performance API Error: ' . ($errorMessage ?: 'An unknown error occurred. Please check server logs for details.');
        }
        
        echo json_encode([
            'success' => false,
            'error' => $userMessage,
            'details' => 'Check server logs for more information',
            'account_id' => $accountId ?? null,
            'error_type' => get_class($e),
            'error_message' => $errorMessage
        ]);
    }
    exit;
}

http_response_code(404);
echo json_encode(['success' => false, 'error' => 'Endpoint not found']);
?>

