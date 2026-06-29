<?php
/**
 * Metric Mapper
 * Maps provider-specific metrics to canonical keys
 * Handles deprecations and replacements
 */

class MetricMapper {
    
    // Canonical metric definitions
    private static $canonicalMetrics = [
        // Audience
        'followers' => ['type' => 'count', 'category' => 'audience'],
        'following' => ['type' => 'count', 'category' => 'audience'],
        
        // Reach & Visibility
        'impressions' => ['type' => 'count', 'category' => 'reach'],
        'reach' => ['type' => 'count', 'category' => 'reach'],
        'profile_views' => ['type' => 'count', 'category' => 'reach'],
        'page_views' => ['type' => 'count', 'category' => 'reach'],
        
        // Engagement
        'likes' => ['type' => 'count', 'category' => 'engagement'],
        'comments' => ['type' => 'count', 'category' => 'engagement'],
        'shares' => ['type' => 'count', 'category' => 'engagement'],
        'saves' => ['type' => 'count', 'category' => 'engagement'],
        'reactions' => ['type' => 'count', 'category' => 'engagement'],
        
        // Video
        'video_views' => ['type' => 'count', 'category' => 'video'],
        'watch_time_seconds' => ['type' => 'duration', 'category' => 'video'],
        'average_view_duration' => ['type' => 'duration', 'category' => 'video'],
        'view_completion_rate' => ['type' => 'percentage', 'category' => 'video'],
        
        // Paid/Ads
        'spend' => ['type' => 'currency', 'category' => 'paid'],
        'cpm' => ['type' => 'currency', 'category' => 'paid'],
        'cpc' => ['type' => 'currency', 'category' => 'paid'],
        'ctr' => ['type' => 'percentage', 'category' => 'paid'],
        'conversions' => ['type' => 'count', 'category' => 'paid'],
        'roas' => ['type' => 'ratio', 'category' => 'paid'],
    ];
    
    // Provider-specific metric mappings
    private static $providerMappings = [
        'meta_facebook' => [
            'page_fans' => 'followers', // DEPRECATED Nov 15, 2025
            'page_followers_count' => 'followers',
            'page_impressions' => 'impressions',
            'page_post_impressions' => 'impressions',
            'page_impressions_unique' => 'reach',
            'page_views_total' => 'page_views',
            'page_post_engagements' => 'engagement',
            'page_fans_online' => 'followers_online',
        ],
        
        'meta_instagram' => [
            'impressions' => 'impressions',
            'reach' => 'reach',
            'profile_views' => 'profile_views',
            'follower_count' => 'followers',
            'website_clicks' => 'website_clicks',
            'email_contacts' => 'email_clicks',
        ],
        
        'youtube' => [
            'views' => 'video_views',
            'estimatedMinutesWatched' => 'watch_time_minutes',
            'averageViewDuration' => 'average_view_duration',
            'subscribersGained' => 'followers_gained',
            'subscribersLost' => 'followers_lost',
            'likes' => 'likes',
            'comments' => 'comments',
            'shares' => 'shares',
        ],
        
        'linkedin' => [
            'followerGains' => 'followers_gained',
            'impressionCount' => 'impressions',
            'clickCount' => 'clicks',
            'engagement' => 'engagement',
            'shares' => 'shares',
        ],
        
        'tiktok' => [
            'video_views' => 'video_views',
            'likes' => 'likes',
            'comments' => 'comments',
            'shares' => 'shares',
            'profile_views' => 'profile_views',
        ],
    ];
    
    /**
     * Map provider metric to canonical key
     * @param string $provider Provider name
     * @param string $providerMetric Provider-specific metric name
     * @return string Canonical metric key
     */
    public static function mapToCanonical($provider, $providerMetric) {
        $mappings = self::$providerMappings[$provider] ?? [];
        return $mappings[$providerMetric] ?? $providerMetric;
    }
    
    /**
     * Check if metric is deprecated
     * @param string $provider Provider name
     * @param string $metricKey Metric key
     * @param PDO $db Database connection
     * @return array|null Deprecation info if deprecated
     */
    public static function checkDeprecation($provider, $metricKey, $db) {
        $stmt = $db->prepare("
            SELECT * FROM deprecations 
            WHERE provider = ? AND metric_key = ? AND status != 'active'
        ");
        $stmt->execute([$provider, $metricKey]);
        return $stmt->fetch(PDO::FETCH_ASSOC);
    }
    
    /**
     * Get replacement metric for deprecated one
     * @param string $provider Provider name
     * @param string $metricKey Deprecated metric key
     * @param PDO $db Database connection
     * @return string|null Replacement metric key
     */
    public static function getReplacement($provider, $metricKey, $db) {
        $deprecation = self::checkDeprecation($provider, $metricKey, $db);
        return $deprecation['replacement_metric'] ?? null;
    }
    
    /**
     * Get metric metadata
     * @param string $canonicalKey Canonical metric key
     * @return array Metric metadata
     */
    public static function getMetricMeta($canonicalKey) {
        return self::$canonicalMetrics[$canonicalKey] ?? ['type' => 'unknown', 'category' => 'other'];
    }
    
    /**
     * Calculate derived metric
     * @param string $derivedMetric Derived metric name
     * @param array $values Array of metric values
     * @return float Calculated value
     */
    public static function calculateDerived($derivedMetric, $values) {
        switch ($derivedMetric) {
            case 'engagement_rate':
                // ER = (likes + comments + saves + shares) / reach
                $engagement = ($values['likes'] ?? 0) + ($values['comments'] ?? 0) + 
                             ($values['saves'] ?? 0) + ($values['shares'] ?? 0);
                $reach = $values['reach'] ?? 0;
                return $reach > 0 ? round(($engagement / $reach) * 100, 2) : 0;
                
            case 'average_view_percentage':
                // YouTube: watch_time / (views * video_length)
                $watchTime = $values['watch_time_seconds'] ?? 0;
                $views = $values['video_views'] ?? 0;
                $videoLength = $values['video_length_seconds'] ?? 0;
                $totalPossible = $views * $videoLength;
                return $totalPossible > 0 ? round(($watchTime / $totalPossible) * 100, 2) : 0;
                
            case 'cpm':
                // Cost per thousand impressions
                $spend = $values['spend'] ?? 0;
                $impressions = $values['impressions'] ?? 0;
                return $impressions > 0 ? round(($spend / $impressions) * 1000, 2) : 0;
                
            case 'cpc':
                // Cost per click
                $spend = $values['spend'] ?? 0;
                $clicks = $values['clicks'] ?? 0;
                return $clicks > 0 ? round($spend / $clicks, 2) : 0;
                
            case 'ctr':
                // Click-through rate
                $clicks = $values['clicks'] ?? 0;
                $impressions = $values['impressions'] ?? 0;
                return $impressions > 0 ? round(($clicks / $impressions) * 100, 2) : 0;
                
            case 'roas':
                // Return on ad spend
                $revenue = $values['revenue'] ?? 0;
                $spend = $values['spend'] ?? 0;
                return $spend > 0 ? round($revenue / $spend, 2) : 0;
                
            default:
                return 0;
        }
    }
}
?>

