-- Table for storing report snapshots for growth comparison
-- This allows weekly/monthly comparison tracking

CREATE TABLE IF NOT EXISTS report_snapshots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_id INT NOT NULL,
    platform VARCHAR(50) NOT NULL,
    period_type ENUM('weekly', 'monthly', 'quarterly') NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    
    -- Account stats snapshot
    followers INT DEFAULT 0,
    following INT DEFAULT 0,
    posts_count INT DEFAULT 0,
    profile_views INT DEFAULT 0,
    website_clicks INT DEFAULT 0,
    
    -- Engagement snapshot
    impressions INT DEFAULT 0,
    reach INT DEFAULT 0,
    total_engagement INT DEFAULT 0,
    likes INT DEFAULT 0,
    comments INT DEFAULT 0,
    shares INT DEFAULT 0,
    saves INT DEFAULT 0,
    engagement_rate DECIMAL(5,2) DEFAULT 0,
    
    -- Content metrics
    total_posts INT DEFAULT 0,
    total_stories INT DEFAULT 0,
    avg_views_per_story INT DEFAULT 0,
    
    -- JSON snapshot of full data (for detailed analysis)
    snapshot_data JSON,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_account_period (account_id, platform, period_type, period_start),
    INDEX idx_period_dates (period_start, period_end),
    UNIQUE KEY unique_snapshot (account_id, platform, period_type, period_start)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Index for faster growth queries
CREATE INDEX idx_account_platform_dates ON report_snapshots(account_id, platform, period_end DESC);













