<?php
// backend/api/update_db_schema.php
require_once __DIR__ . '/../config/database.php';
header('Content-Type: text/plain');

$db = new Database();
$conn = $db->getConnection();

echo "🛠️ UPDATING DATABASE SCHEMA\n";
echo "--------------------------\n";

function addColumn($conn, $table, $column, $type)
{
    try {
        // Check if column exists
        $stmt = $conn->query("SHOW COLUMNS FROM $table LIKE '$column'");
        if ($stmt->rowCount() > 0) {
            echo "   - Column '$column' already exists in '$table'.\n";
            return;
        }

        // Add column
        $conn->exec("ALTER TABLE $table ADD COLUMN $column $type");
        echo "✅ Added column '$column' to '$table'.\n";

    } catch (PDOException $e) {
        echo "❌ Error adding column to '$table': " . $e->getMessage() . "\n";
    }
}

// Add to 'accounts'
addColumn($conn, 'accounts', 'owner_name', 'VARCHAR(255) DEFAULT NULL');

// Add to 'ad_accounts'
addColumn($conn, 'ad_accounts', 'owner_name', 'VARCHAR(255) DEFAULT NULL');

echo "\nDone.\n";
?>