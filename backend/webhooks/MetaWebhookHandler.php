<?php
/**
 * Meta Webhooks Handler
 * Handles webhook verification and subscriptions for Instagram & Facebook Pages
 */

class MetaWebhookHandler {
    private $verifyToken;
    private $appSecret;
    
    public function __construct() {
        $this->verifyToken = defined('WEBHOOK_VERIFY_TOKEN') ? WEBHOOK_VERIFY_TOKEN : 'your_verify_token_here';
        $this->appSecret = FACEBOOK_APP_SECRET;
    }
    
    /**
     * Handle webhook verification challenge
     * @return void
     */
    public function handleVerification() {
        $mode = $_GET['hub_mode'] ?? '';
        $token = $_GET['hub_verify_token'] ?? '';
        $challenge = $_GET['hub_challenge'] ?? '';
        
        if ($mode === 'subscribe' && $token === $this->verifyToken) {
            // Respond with challenge to verify webhook
            echo $challenge;
            http_response_code(200);
        } else {
            // Verification failed
            http_response_code(403);
            echo json_encode(['error' => 'Verification failed']);
        }
    }
    
    /**
     * Verify webhook signature
     * @param string $payload Raw POST body
     * @param string $signature X-Hub-Signature-256 header
     * @return bool
     */
    public function verifySignature($payload, $signature) {
        if (!$signature) {
            return false;
        }
        
        // Remove 'sha256=' prefix
        $signature = str_replace('sha256=', '', $signature);
        
        // Calculate expected signature
        $expectedSignature = hash_hmac('sha256', $payload, $this->appSecret);
        
        // Constant-time comparison to prevent timing attacks
        return hash_equals($expectedSignature, $signature);
    }
    
    /**
     * Handle incoming webhook POST
     * @return void
     */
    public function handleWebhook() {
        // Get raw POST body
        $payload = file_get_contents('php://input');
        
        // Get signature header
        $signature = $_SERVER['HTTP_X_HUB_SIGNATURE_256'] ?? '';
        
        // Verify signature
        if (!$this->verifySignature($payload, $signature)) {
            http_response_code(401);
            echo json_encode(['error' => 'Invalid signature']);
            return;
        }
        
        // Parse payload
        $data = json_decode($payload, true);
        
        if (!$data) {
            http_response_code(400);
            echo json_encode(['error' => 'Invalid JSON']);
            return;
        }
        
        // Process webhook entries
        foreach ($data['entry'] ?? [] as $entry) {
            $this->processEntry($entry);
        }
        
        // Acknowledge receipt
        http_response_code(200);
        echo json_encode(['status' => 'ok']);
    }
    
    /**
     * Process individual webhook entry
     * @param array $entry Webhook entry data
     * @return void
     */
    private function processEntry($entry) {
        $id = $entry['id'] ?? null;
        $time = $entry['time'] ?? null;
        $changes = $entry['changes'] ?? [];
        
        foreach ($changes as $change) {
            $field = $change['field'] ?? null;
            $value = $change['value'] ?? [];
            
            switch ($field) {
                case 'comments':
                    $this->handleComment($value);
                    break;
                    
                case 'mentions':
                    $this->handleMention($value);
                    break;
                    
                case 'feed':
                    $this->handleFeed($value);
                    break;
                    
                case 'messages':
                    $this->handleMessage($value);
                    break;
                    
                default:
                    // Log unknown field type
                    error_log("Unknown webhook field: $field");
            }
        }
    }
    
    /**
     * Handle comment webhook
     * @param array $data Comment data
     * @return void
     */
    private function handleComment($data) {
        // Process comment
        // Example: Store in database, send notification, etc.
        error_log('Comment received: ' . json_encode($data));
        
        // You can implement your business logic here
        // e.g., Respond to comments, moderate, analyze sentiment
    }
    
    /**
     * Handle mention webhook
     * @param array $data Mention data
     * @return void
     */
    private function handleMention($data) {
        // Process mention
        error_log('Mention received: ' . json_encode($data));
        
        // Business logic: Track brand mentions, respond, etc.
    }
    
    /**
     * Handle feed webhook
     * @param array $data Feed data
     * @return void
     */
    private function handleFeed($data) {
        // Process feed update
        error_log('Feed update received: ' . json_encode($data));
        
        // Business logic: Track new posts, analyze engagement, etc.
    }
    
    /**
     * Handle message webhook
     * @param array $data Message data
     * @return void
     */
    private function handleMessage($data) {
        // Process message
        error_log('Message received: ' . json_encode($data));
        
        // Business logic: Customer service bot, auto-reply, etc.
    }
}
?>

