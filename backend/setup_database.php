<?php
/**
 * Database Setup Script
 * Creates the reports table if it doesn't exist
 */

require_once __DIR__ . '/config/database.php';

try {
    $db = new Database();
    $conn = $db->getConnection();
    
    // Read the SQL file
    $sql = file_get_contents(__DIR__ . '/migrations/create_reports_table.sql');
    
    // Execute the SQL
    $conn->exec($sql);
    
    echo json_encode([
        'success' => true,
        'message' => 'Database table created successfully'
    ]);
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>

















