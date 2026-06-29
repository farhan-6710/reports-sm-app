<?php
/**
 * Webhooks Endpoint
 * Handle Meta webhook verification and incoming events
 */

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../webhooks/MetaWebhookHandler.php';

$method = $_SERVER['REQUEST_METHOD'];

// Initialize webhook handler
$handler = new MetaWebhookHandler();

// GET - Webhook verification (Meta sends this to verify your endpoint)
if ($method === 'GET') {
    $handler->handleVerification();
    exit;
}

// POST - Webhook events (Meta sends actual events here)
if ($method === 'POST') {
    $handler->handleWebhook();
    exit;
}

// Invalid method
http_response_code(405);
echo json_encode(['error' => 'Method not allowed']);
?>

