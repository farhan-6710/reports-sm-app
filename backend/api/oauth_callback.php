<?php
/**
 * OAuth Callback Handler
 * Receives Facebook OAuth callback and redirects to frontend
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/oauth_login.php';

// Get code and state from Facebook
$code = $_GET['code'] ?? '';
$state = $_GET['state'] ?? '';
$error = $_GET['error'] ?? '';

if (!empty($error)) {
    // Facebook returned an error
    header('Location: ' . FRONTEND_URL . '?oauth=error&message=' . urlencode($error));
    exit;
}

if (empty($code) || empty($state)) {
    header('Location: ' . FRONTEND_URL . '?oauth=error&message=' . urlencode('Missing authorization code or state'));
    exit;
}

// Exchange code for token (this will be handled by oauth_login.php)
// We'll redirect to frontend with the state so the frontend can complete the flow
header('Location: ' . FRONTEND_URL . '/oauth/callback?code=' . urlencode($code) . '&state=' . urlencode($state));
exit;
?>

