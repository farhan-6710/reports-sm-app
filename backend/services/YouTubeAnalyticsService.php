<?php
/**
 * YouTube Analytics Service
 * Handles YouTube Analytics API & Data API v3
 */

require_once __DIR__ . '/MetricMapper.php';

class YouTubeAnalyticsService {
    private $accessToken;
    private $apiKey;
    
    public function __construct($accessToken, $apiKey = null) {
        $this->accessToken = $accessToken;
        $this->apiKey = $apiKey ?? YOUTUBE_API_KEY;
    }
    
    /**
     * Fetch channel analytics
     * @param string $channelId YouTube channel ID
     * @param string $startDate Start date (YYYY-MM-DD)
     * @param string $endDate End date (YYYY-MM-DD)
     * @return array Analytics data
     */
    public function fetchChannelAnalytics($channelId, $startDate, $endDate) {
        $metrics = [
            'views',
            'estimatedMinutesWatched',
            'averageViewDuration',
            'subscribersGained',
            'subscribersLost',
            'likes',
            'dislikes',
            'comments',
            'shares',
            'videosAddedToPlaylists',
            'videosRemovedFromPlaylists'
        ];
        
        $dimensions = 'day'; // Can be: day, month, video, etc.
        
        $url = 'https://youtubeanalytics.googleapis.com/v2/reports';
        $params = [
            'ids' => 'channel==' . $channelId,
            'startDate' => $startDate,
            'endDate' => $endDate,
            'metrics' => implode(',', $metrics),
            'dimensions' => $dimensions,
            'access_token' => $this->accessToken
        ];
        
        return $this->makeRequest($url, $params);
    }
    
    /**
     * Get channel info
     * @param string $channelId Channel ID
     * @return array Channel data
     */
    public function getChannelInfo($channelId) {
        $url = 'https://www.googleapis.com/youtube/v3/channels';
        $params = [
            'part' => 'snippet,statistics,contentDetails',
            'id' => $channelId,
            'key' => $this->apiKey
        ];
        
        $response = $this->makeRequest($url, $params);
        
        return $response['items'][0] ?? [];
    }
    
    /**
     * Get video analytics
     * @param string $videoId Video ID
     * @param string $startDate Start date
     * @param string $endDate End date
     * @return array Video analytics
     */
    public function fetchVideoAnalytics($videoId, $startDate, $endDate) {
        $metrics = [
            'views',
            'estimatedMinutesWatched',
            'averageViewDuration',
            'averageViewPercentage',
            'likes',
            'comments',
            'shares'
        ];
        
        $url = 'https://youtubeanalytics.googleapis.com/v2/reports';
        $params = [
            'ids' => 'channel==MINE',
            'startDate' => $startDate,
            'endDate' => $endDate,
            'metrics' => implode(',', $metrics),
            'filters' => 'video==' . $videoId,
            'access_token' => $this->accessToken
        ];
        
        return $this->makeRequest($url, $params);
    }
    
    /**
     * Make HTTP request
     * @param string $url API URL
     * @param array $params Query parameters
     * @return array Response data
     */
    private function makeRequest($url, $params) {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        $data = json_decode($response, true);
        
        if ($httpCode !== 200 || isset($data['error'])) {
            $errorMsg = $data['error']['message'] ?? 'Unknown YouTube API error';
            error_log("YouTube API Error: $errorMsg");
            throw new Exception("YouTube API Error: $errorMsg");
        }
        
        return $data;
    }
}
?>

