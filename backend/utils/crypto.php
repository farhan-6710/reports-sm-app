<?php
/**
 * Helper functions for encrypting and decrypting sensitive tokens
 * Falls back to plaintext if OpenSSL is not available (development mode)
 */

if (!defined('TOKEN_ENCRYPTION_KEY')) {
    // Define a default key if not set (for development only)
    define('TOKEN_ENCRYPTION_KEY', 'development_key_change_me_32_chars!');
}

const TOKEN_ENCRYPTION_METHOD = 'AES-256-CBC';

// Check if OpenSSL is available
$openssl_available = extension_loaded('openssl') && function_exists('openssl_encrypt') && function_exists('openssl_decrypt');

/**
 * Encrypt a token value using OpenSSL, or return plaintext if OpenSSL is not available.
 */
function encryptToken(string $plainText): string {
    global $openssl_available;
    
    if ($plainText === '') {
        return '';
    }

    // Fallback to plaintext if OpenSSL is not available (development mode)
    if (!$openssl_available) {
        error_log('WARNING: OpenSSL not available, storing token in plaintext (development mode only)');
        return $plainText;
    }

    try {
        $key = hash('sha256', TOKEN_ENCRYPTION_KEY, true);
        $iv = random_bytes(openssl_cipher_iv_length(TOKEN_ENCRYPTION_METHOD));
        $cipherText = openssl_encrypt($plainText, TOKEN_ENCRYPTION_METHOD, $key, OPENSSL_RAW_DATA, $iv);

        if ($cipherText === false) {
            error_log('WARNING: OpenSSL encryption failed, storing token in plaintext');
            return $plainText;
        }

        return base64_encode($iv . $cipherText);
    } catch (Exception $e) {
        error_log('WARNING: Encryption error: ' . $e->getMessage() . ', storing token in plaintext');
        return $plainText;
    }
}

/**
 * Decrypt a token value that was encrypted with encryptToken.
 * Handles both encrypted and plaintext tokens (backward compatibility).
 */
function decryptToken(?string $encrypted): string {
    global $openssl_available;
    
    if ($encrypted === null || $encrypted === '') {
        return '';
    }

    // If OpenSSL is not available, assume it's plaintext
    if (!$openssl_available) {
        return $encrypted;
    }

    try {
        $decoded = base64_decode($encrypted, true);
        $ivLength = openssl_cipher_iv_length(TOKEN_ENCRYPTION_METHOD);

        // If decoding fails or data is too short, likely stored in plaintext
        if ($decoded === false || strlen($decoded) <= $ivLength) {
            return $encrypted;
        }

        $iv = substr($decoded, 0, $ivLength);
        $cipherText = substr($decoded, $ivLength);
        $key = hash('sha256', TOKEN_ENCRYPTION_KEY, true);

        $plainText = openssl_decrypt($cipherText, TOKEN_ENCRYPTION_METHOD, $key, OPENSSL_RAW_DATA, $iv);
        return $plainText === false ? $encrypted : $plainText;
    } catch (Exception $e) {
        // If decryption fails, return as-is (might be plaintext)
        error_log('WARNING: Decryption error: ' . $e->getMessage() . ', returning as-is');
        return $encrypted;
    }
}
?>

