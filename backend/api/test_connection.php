<?php
// Simple connection test
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");

error_reporting(E_ALL);
ini_set('display_errors', 1);

$result = [
    'backend_running' => true,
    'timestamp' => date('Y-m-d H:i:s'),
    'tests' => []
];

// Test 1: Check if config files exist
$result['tests']['config_file'] = file_exists(__DIR__ . '/../config/config.php') ? 'OK' : 'MISSING';
$result['tests']['database_file'] = file_exists(__DIR__ . '/../config/database.php') ? 'OK' : 'MISSING';

// Test 2: Try to include config
try {
    require_once __DIR__ . '/../config/config.php';
    $result['tests']['config_loaded'] = 'OK';
} catch (Exception $e) {
    $result['tests']['config_loaded'] = 'ERROR: ' . $e->getMessage();
}

// Test 3: Try database connection
try {
    require_once __DIR__ . '/../config/database.php';
    $db = new Database();
    $conn = $db->getConnection();
    $result['tests']['database_connection'] = 'OK';
    $result['tests']['database_name'] = 'social_media_reports';
    
    // Try a simple query
    $stmt = $conn->query("SELECT 1 as test");
    $result['tests']['database_query'] = 'OK';
    
} catch (Exception $e) {
    $result['tests']['database_connection'] = 'ERROR: ' . $e->getMessage();
    $result['tests']['database_query'] = 'FAILED';
}

// Test 4: Check MySQL service
$result['tests']['mysql_port'] = @fsockopen('127.0.0.1', 3306) ? 'OPEN' : 'CLOSED';

echo json_encode($result, JSON_PRETTY_PRINT);




