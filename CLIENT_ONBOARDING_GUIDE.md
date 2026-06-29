<?php
/**
 * Bulk Import Clients from CSV
 * Usage: php bulk_import_clients.php clients.csv
 */

require_once __DIR__ . '/../config/database.php';

if ($argc < 2) {
    die("Usage: php bulk_import_clients.php clients.csv\n");
}

$csvFile = $argv[1];

if (!file_exists($csvFile)) {
    die("Error: File not found: $csvFile\n");
}

$db = new Database();
$conn = $db->getConnection();

$handle = fopen($csvFile, 'r');
$header = fgetcsv($handle); // Skip header row

$imported = 0;
$errors = 0;

echo "Starting bulk import...\n\n";

while (($row = fgetcsv($handle)) !== false) {
    try {
        list($platform, $accountName, $accountId, $accessToken, $handle) = $row;
        
        // Insert account
        $stmt = $conn->prepare("
            INSERT INTO accounts (platform, account_name, account_id, handle, access_token, is_active)
            VALUES (?, ?, ?, ?, ?, 1)
            ON DUPLICATE KEY UPDATE
                account_name = VALUES(account_name),
                handle = VALUES(handle),
                access_token = VALUES(access_token),
                updated_at = NOW()
        ");
        
        $stmt->execute([
            strtolower($platform),
            $accountName,
            $accountId,
            $handle ?: null,
            $accessToken
        ]);
        
        // Insert token record
        $accountIdDb = $conn->lastInsertId() ?: $conn->query("SELECT id FROM accounts WHERE account_id = '$accountId'")->fetchColumn();
        
        $stmt = $conn->prepare("
            INSERT INTO tokens (account_id, provider, access_token, token_type, is_active)
            VALUES (?, ?, ?, 'bearer', 1)
            ON DUPLICATE KEY UPDATE
                access_token = VALUES(access_token),
                updated_at = NOW()
        ");
        
        $provider = in_array($platform, ['facebook', 'instagram']) ? 'meta' : $platform;
        $stmt->execute([$accountIdDb, $provider, $accessToken]);
        
        echo "✓ Imported: $accountName ($platform)\n";
        $imported++;
        
    } catch (Exception $e) {
        echo "✗ Error importing row: " . $e->getMessage() . "\n";
        $errors++;
    }
}

fclose($handle);

echo "\n" . str_repeat('=', 50) . "\n";
echo "Import Complete!\n";
echo "Successfully imported: $imported accounts\n";
echo "Errors: $errors\n";
echo str_repeat('=', 50) . "\n";
?>

