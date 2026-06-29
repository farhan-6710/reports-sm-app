<?php
require_once __DIR__ . '/load_env.php';

// API Configuration
define('API_URL', getenv('API_URL') ?: 'http://localhost:8080/api');
define('FRONTEND_URL', getenv('FRONTEND_URL') ?: 'http://localhost:3000');

// Timezone
date_default_timezone_set('UTC');

// Error reporting (Keep enabled for debugging, disable for production)
ini_set('display_errors', 1);
error_reporting(E_ALL);

// Social Media API Keys
define('FACEBOOK_APP_ID', getenv('FACEBOOK_APP_ID') ?: '872614585203502');
define('FACEBOOK_APP_SECRET', getenv('FACEBOOK_APP_SECRET') ?: 'd450013c48f80256e1bb7bf3427e897f');
define('FACEBOOK_API_VERSION', getenv('FACEBOOK_API_VERSION') ?: 'v18.0');

// Callbacks
define('FACEBOOK_REDIRECT_URI', getenv('FACEBOOK_REDIRECT_URI') ?: FRONTEND_URL . '/oauth/callback');

// Security Keys
define('TOKEN_ENCRYPTION_KEY', getenv('TOKEN_ENCRYPTION_KEY') ?: 'development_key_change_me_32_chars!');
define('OAUTH_STATE_TTL', 15 * 60); // 15 minutes
define('WEBHOOK_VERIFY_TOKEN', getenv('WEBHOOK_VERIFY_TOKEN') ?: 'your_random_secure_token_here');

// Optional - Other platforms
define('INSTAGRAM_ACCESS_TOKEN', getenv('INSTAGRAM_ACCESS_TOKEN') ?: 'YOUR_INSTAGRAM_TOKEN');
define('TWITTER_API_KEY', getenv('TWITTER_API_KEY') ?: 'YOUR_TWITTER_API_KEY');
define('TWITTER_API_SECRET', getenv('TWITTER_API_SECRET') ?: 'YOUR_TWITTER_API_SECRET');
define('LINKEDIN_CLIENT_ID', getenv('LINKEDIN_CLIENT_ID') ?: 'YOUR_LINKEDIN_CLIENT_ID');
define('LINKEDIN_CLIENT_SECRET', getenv('LINKEDIN_CLIENT_SECRET') ?: 'YOUR_LINKEDIN_CLIENT_SECRET');
define('YOUTUBE_API_KEY', getenv('YOUTUBE_API_KEY') ?: 'YOUR_YOUTUBE_API_KEY');

// IMPORTANT: NO CLOSING PHP TAG AT THE END
