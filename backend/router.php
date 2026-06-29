<?php
/**
 * Router for PHP built-in server
 * Routes /api/* requests to backend/api/*.php files
 */

// Get the request URI
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));

// CORS Headers - Set for all requests
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Access-Control-Max-Age: 3600");

// Handle OPTIONS preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// Handle /api/* routes
if (preg_match('#^/api/(.+)$#', $uri, $matches)) {
    $pathParts = explode('/', $matches[1]);
    $endpoint = $pathParts[0];
    
    // Remove .php extension if it exists
    $endpoint = preg_replace('/\.php$/', '', $endpoint);
    
    // Try to find the API file
    $apiFile = __DIR__ . '/api/' . $endpoint . '.php';
    
    if (file_exists($apiFile)) {
        // Include the API file - it will handle sub-paths internally
        require $apiFile;
        exit;
    } else {
        // File not found
        http_response_code(404);
        header('Content-Type: application/json');
        echo json_encode([
            'success' => false, 
            'error' => 'API endpoint not found: ' . $matches[1],
            'requested_file' => $apiFile,
            'uri' => $uri,
            'endpoint' => $endpoint
        ]);
        exit;
    }
}

// For non-API routes, return 404
http_response_code(404);
header('Content-Type: application/json');
echo json_encode([
    'success' => false, 
    'error' => 'Route not found',
    'uri' => $uri
]);
exit;
