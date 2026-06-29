-- Complete Database Setup for Social Media Reports
-- Run this file to create all necessary tables

CREATE DATABASE IF NOT EXISTS social_media_reports;
USE social_media_reports;

-- ============================================
-- 1. REPORTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS reports (
    id INT AUTO_INCREMENT PRIMARY KEY,
    platform VARCHAR(50) NOT NULL,
    platform_id VARCHAR(255) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    data JSON NOT NULL,
    type VARCHAR(50) DEFAULT 'organic',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_platform (platform),
    INDEX idx_dates (start_date, end_date)
);

-- ============================================
-- 2. ACCOUNTS TABLE (Organic Accounts)
-- ============================================
CREATE TABLE IF NOT EXISTS accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NULL,
    platform VARCHAR(50) NOT NULL,
    account_name VARCHAR(255) NOT NULL,
    account_id VARCHAR(255) NOT NULL,
    access_token TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    status VARCHAR(50) DEFAULT 'active' COMMENT 'active, inactive',
    inactive_reason TEXT NULL COMMENT 'Reason if account is inactive',
    followers_count INT DEFAULT 0,
    ad_account_id VARCHAR(255) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_user_account (user_id, platform, account_id),
    INDEX idx_user_id (user_id),
    INDEX idx_platform (platform),
    INDEX idx_account_id (account_id)
);

-- ============================================
-- 3. AD ACCOUNTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS ad_accounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    client_name VARCHAR(255) NOT NULL,
    ad_account_id VARCHAR(255) NOT NULL UNIQUE,
    access_token TEXT NOT NULL,
    currency VARCHAR(10) DEFAULT 'INR',
    account_name VARCHAR(255),
    is_active TINYINT(1) DEFAULT 1,
    status VARCHAR(50) DEFAULT 'active' COMMENT 'active, inactive',
    inactive_reason TEXT NULL,
    last_checked TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_active (is_active),
    INDEX idx_client (client_name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 4. OAUTH STATES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS oauth_states (
    id INT AUTO_INCREMENT PRIMARY KEY,
    state_token VARCHAR(64) NOT NULL UNIQUE,
    request_type VARCHAR(50) NOT NULL,
    access_token TEXT DEFAULT NULL,
    token_type VARCHAR(50) DEFAULT NULL,
    token_expires_at DATETIME DEFAULT NULL,
    facebook_user_id VARCHAR(100) DEFAULT NULL,
    facebook_user_name VARCHAR(255) DEFAULT NULL,
    metadata JSON DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    consumed_at TIMESTAMP NULL DEFAULT NULL,
    INDEX idx_facebook_user (facebook_user_id)
);

-- ============================================
-- 5. USERS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- 6. INSTAGRAM STORIES ARCHIVE
-- ============================================
CREATE TABLE IF NOT EXISTS instagram_stories_archive (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_id VARCHAR(255) NOT NULL,
    story_id VARCHAR(255) NOT NULL UNIQUE,
    media_type VARCHAR(50) NOT NULL,
    media_url TEXT,
    thumbnail_url TEXT,
    permalink TEXT,
    timestamp DATETIME NOT NULL,
    impressions INT DEFAULT 0,
    reach INT DEFAULT 0,
    replies INT DEFAULT 0,
    taps_forward INT DEFAULT 0,
    taps_back INT DEFAULT 0,
    exits INT DEFAULT 0,
    link_clicks INT DEFAULT 0,
    engagement INT DEFAULT 0,
    completion_rate DECIMAL(5,2) DEFAULT 0,
    insights_data JSON,
    fetched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_account_id (account_id),
    INDEX idx_timestamp (timestamp),
    INDEX idx_story_id (story_id)
);

-- ============================================
-- 7. FOLLOWER SNAPSHOTS
-- ============================================
CREATE TABLE IF NOT EXISTS follower_snapshots (
    id INT AUTO_INCREMENT PRIMARY KEY,
    account_id INT NOT NULL,
    date DATE NOT NULL,
    follower_count INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    UNIQUE KEY unique_snapshot (account_id, date),
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
    INDEX idx_account_date (account_id, date),
    INDEX idx_date (date)
);

-- ============================================
-- 8. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    type VARCHAR(50) NOT NULL COMMENT 'new_account, new_report, token_expired, error',
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    account_id INT NULL,
    metadata JSON COMMENT 'Additional data',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE SET NULL,
    INDEX idx_type (type),
    INDEX idx_read (is_read),
    INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================
-- 9. SYSTEM TOKEN TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS system_token (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- ============================================
-- SUCCESS MESSAGE
-- ============================================
SELECT 'Database setup completed successfully!' AS message;












