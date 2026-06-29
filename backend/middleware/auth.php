<?php
class Auth {
    
    public static function verifyToken($token) {
        // In production, use JWT or similar
        if (!isset($token) || empty($token)) {
            http_response_code(401);
            echo json_encode(['error' => 'Authorization token required']);
            exit;
        }
        return true;
    }

    public static function generateToken($userId) {
        // Generate a simple token (use JWT in production)
        return base64_encode($userId . ':' . time());
    }
}
?>

