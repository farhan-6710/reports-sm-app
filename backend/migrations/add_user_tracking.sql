-- Migration: Add user tracking to accounts and oauth_states
USE social_media_reports;

-- Add user_id column to accounts (nullable for backward compatibility)
ALTER TABLE accounts 
ADD COLUMN user_id INT NULL AFTER id,
ADD INDEX idx_user_id (user_id);

-- Update unique constraint to allow same account_id for different users
ALTER TABLE accounts 
DROP INDEX account_id,
ADD UNIQUE KEY unique_user_account (user_id, platform, account_id);

-- Add Facebook user tracking to oauth_states
ALTER TABLE oauth_states 
ADD COLUMN facebook_user_id VARCHAR(100) NULL AFTER token_expires_at,
ADD COLUMN facebook_user_name VARCHAR(255) NULL AFTER facebook_user_id,
ADD INDEX idx_facebook_user (facebook_user_id);

