<?php
// Simple health check - no database required
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

echo json_encode([
    'status' => 'ok',
    'message' => 'Backend is running',
    'timestamp' => date('Y-m-d H:i:s'),
    'php_version' => phpversion()
]);




