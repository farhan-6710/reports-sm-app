<?php
/**
 * Facebook OAuth Handler
 * Implements Facebook Login for Business with Long-Lived Token Exchange
 */

class FacebookOAuth {
    private $appId;
    private $appSecret;
    private $redirectUri;
    
    public function __construct() {
        $this->appId = FACEBOOK_APP_ID;
        $this->appSecret = FACEBOOK_APP_SECRET;
        $this->redirectUri = API_URL . '/auth/meta/callback';
    }
    
    /**
     * Generate OAuth login URL
     * @return string Login URL
     */
    public function getLoginUrl($state = null) {
        $state = $state ?? bin2hex(random_bytes(16));
        
        // Required scopes for organic + paid reporting
        $scopes = [
            // Facebook Pages - Organic
            'pages_show_list',
            'pages_read_engagement',
            'pages_read_user_content',
            'read_insights',
            
            // Instagram - Organic
            'instagram_basic',
            'instagram_manage_insights',
            
            // Ads - Inorganic/Paid
            'ads_read',
            
            // Business Management
            'business_management',
        ];
        
        $params = [
            'client_id' => $this->appId,
            'redirect_uri' => $this->redirectUri,
            'state' => $state,
            'scope' => implode(',', $scopes),
            'response_type' => 'code',
        ];
        
        return 'https://www.facebook.com/v18.0/dialog/oauth?' . http_build_query($params);
    }
    
    /**
     * Exchange authorization code for access token
     * @param string $code Authorization code from callback
     * @return array Token data
     */
    public function exchangeCodeForToken($code) {
        $url = 'https://graph.facebook.com/v18.0/oauth/access_token';
        
        $params = [
            'client_id' => $this->appId,
            'client_secret' => $this->appSecret,
            'redirect_uri' => $this->redirectUri,
            'code' => $code,
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        if ($httpCode !== 200) {
            throw new Exception('Failed to exchange code for token: ' . $response);
        }
        
        return json_decode($response, true);
    }
    
    /**
     * Exchange short-lived token for long-lived token (60 days)
     * @param string $shortLivedToken Short-lived access token
     * @return array Long-lived token data
     */
    public function exchangeForLongLivedToken($shortLivedToken) {
        $url = 'https://graph.facebook.com/v18.0/oauth/access_token';
        
        $params = [
            'grant_type' => 'fb_exchange_token',
            'client_id' => $this->appId,
            'client_secret' => $this->appSecret,
            'fb_exchange_token' => $shortLivedToken,
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        
        $response = curl_exec($ch);
        curl_close($ch);
        
        $data = json_decode($response, true);
        
        if (isset($data['error'])) {
            throw new Exception('Failed to exchange for long-lived token: ' . $data['error']['message']);
        }
        
        return $data;
    }
    
    /**
     * Get Page Access Tokens (never expire!)
     * @param string $userAccessToken User access token
     * @return array Pages with their tokens
     */
    public function getPageTokens($userAccessToken) {
        $url = 'https://graph.facebook.com/v18.0/me/accounts';
        
        $params = [
            'access_token' => $userAccessToken,
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        
        $response = curl_exec($ch);
        curl_close($ch);
        
        $data = json_decode($response, true);
        
        if (isset($data['error'])) {
            throw new Exception('Failed to get page tokens: ' . $data['error']['message']);
        }
        
        return $data['data'] ?? [];
    }
    
    /**
     * Complete OAuth flow and get page tokens
     * @param string $code Authorization code
     * @return array Pages with never-expiring tokens
     */
    public function completeOAuthFlow($code) {
        // Step 1: Exchange code for short-lived token
        $shortLivedData = $this->exchangeCodeForToken($code);
        $shortLivedToken = $shortLivedData['access_token'];
        
        // Step 2: Exchange for long-lived token (60 days)
        $longLivedData = $this->exchangeForLongLivedToken($shortLivedToken);
        $longLivedToken = $longLivedData['access_token'];
        
        // Step 3: Get Page tokens (never expire!)
        $pages = $this->getPageTokens($longLivedToken);
        
        return [
            'user_token' => $longLivedToken,
            'expires_in' => $longLivedData['expires_in'] ?? 5184000, // 60 days
            'pages' => $pages,
        ];
    }
    
    /**
     * Debug access token
     * @param string $accessToken Token to debug
     * @return array Token info
     */
    public function debugToken($accessToken) {
        $url = 'https://graph.facebook.com/v18.0/debug_token';
        
        $params = [
            'input_token' => $accessToken,
            'access_token' => $this->appId . '|' . $this->appSecret,
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url . '?' . http_build_query($params));
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        
        $response = curl_exec($ch);
        curl_close($ch);
        
        return json_decode($response, true);
    }
}
?>

