<?php
// backend/api/accounts.php
// FINAL AND COMPLETE CODE

// 1. CORS Headers
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// 2. Handle Preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// 3. Error Handling - TEMPORARILY SET TO DISPLAY ALL ERRORS
ini_set('display_errors', 1); // Set to 1 to show PHP errors
error_reporting(E_ALL);

// Initialize $stmt outside the try block for error reporting
$stmt = null;

try {
    // Include Config & DB
    if (file_exists(__DIR__ . '/../config/config.php')) {
        require_once __DIR__ . '/../config/config.php';
    }

    if (file_exists(__DIR__ . '/../config/database.php')) {
        require_once __DIR__ . '/../config/database.php';
    } else {
        throw new Exception("Missing database.php file");
    }

    // Include Crypto Helper
    if (file_exists(__DIR__ . '/../utils/crypto.php')) {
        require_once __DIR__ . '/../utils/crypto.php';
    }
    if (!function_exists('encryptToken')) {
        function encryptToken($t)
        {
            return $t;
        }
    }

    $method = $_SERVER['REQUEST_METHOD'];
    $db = new Database();
    $conn = $db->getConnection();

    // --- GET ACCOUNTS ---
    if ($method === 'GET') {
        $stmt = $conn->query("SELECT * FROM accounts WHERE is_active = 1 ORDER BY created_at DESC");
        $accounts = $stmt->fetchAll(PDO::FETCH_ASSOC);

        // Hide tokens for security
        foreach ($accounts as &$account) {
            unset($account['access_token']);
        }

        echo json_encode(['success' => true, 'data' => $accounts]);
        exit;
    }

    // --- ADD ACCOUNT ---
    if ($method === 'POST') {
        // 1. Capture Input (JSON or Form Data)
        $rawInput = file_get_contents('php://input');
        $input = json_decode($rawInput, true);
        if (!$input) {
            $input = $_POST;
        } // Fallback

        // Log received data for debugging (remove sensitive token in production)
        error_log("Received POST data: " . json_encode(array_merge($input, ['access_token' => isset($input['access_token']) ? '***HIDDEN***' : 'not set'])));

        // 2. Smart Variable Mapping (Catches all potential name mismatches)
        $platform    = $input['platform'] ?? 'Unknown Platform';
        $accountName = $input['account_name'] ?? $input['name'] ?? $input['accountName'] ?? 'Unnamed Account';
        $accountId   = $input['account_id'] ?? $input['id'] ?? $input['platformId'] ?? $input['platform_id'] ?? null;
        $accessToken = $input['access_token'] ?? $input['accessToken'] ?? $input['token'] ?? '';
        $adAccountId = $input['ad_account_id'] ?? $input['adAccountId'] ?? null;
        $followersCount = $input['followers_count'] ?? 0; // Use default from DB

        // 3. Validation
        if (empty($accountId)) {
            // Throwing a custom, clear error for debugging
            error_log("Validation failed: Missing account_id. Received data: " . json_encode($input));
            throw new Exception("Validation Error: Missing 'Platform ID' (account_id). Received: " . json_encode(array_keys($input)));
        }

        // Additional validation
        if (empty($platform) || $platform === 'Unknown Platform') {
            throw new Exception("Validation Error: Missing or invalid 'platform'. Received: " . ($input['platform'] ?? 'not set'));
        }

        if (empty($accountName) || $accountName === 'Unnamed Account') {
            throw new Exception("Validation Error: Missing or invalid 'account_name'. Received: " . ($input['account_name'] ?? 'not set'));
        }

        $encryptedToken = encryptToken($accessToken);

        // 4. Check which columns exist in the database
        $columnsToCheck = ['ad_account_id', 'followers_count'];
        $existingColumns = [];
        $stmt_check = $conn->query("SHOW COLUMNS FROM accounts");
        $allColumns = $stmt_check->fetchAll(PDO::FETCH_COLUMN);

        foreach ($columnsToCheck as $col) {
            if (in_array($col, $allColumns)) {
                $existingColumns[] = $col;
            }
        }

        // 5. Build dynamic query based on available columns
        $hasAdAccountId = in_array('ad_account_id', $existingColumns);
        $hasFollowersCount = in_array('followers_count', $existingColumns);

        // Base columns that always exist
        $insertColumns = ['platform', 'account_name', 'account_id', 'access_token', 'is_active', 'created_at'];
        $insertValues = ['?', '?', '?', '?', '1', 'NOW()'];
        $executeParams = [$platform, $accountName, $accountId, $encryptedToken];

        // Add optional columns if they exist
        if ($hasAdAccountId) {
            $insertColumns[] = 'ad_account_id';
            $insertValues[] = '?';
            $executeParams[] = $adAccountId;
        }

        if ($hasFollowersCount) {
            $insertColumns[] = 'followers_count';
            $insertValues[] = '?';
            $executeParams[] = $followersCount;
        }

        // Build ON DUPLICATE KEY UPDATE clause
        $updateClause = [
            'account_name = VALUES(account_name)',
            'access_token = VALUES(access_token)',
            'is_active = 1',
            'updated_at = NOW()'
        ];

        if ($hasAdAccountId) {
            $updateClause[] = 'ad_account_id = VALUES(ad_account_id)';
        }

        if ($hasFollowersCount) {
            $updateClause[] = 'followers_count = VALUES(followers_count)';
        }

        // 6. Insert/Update Query (ON DUPLICATE KEY UPDATE for safety)
        $query = "INSERT INTO accounts (" . implode(', ', $insertColumns) . ")
                  VALUES (" . implode(', ', $insertValues) . ")
                  ON DUPLICATE KEY UPDATE " . implode(', ', $updateClause);

        // Log the query and parameters for debugging (hide token)
        $logParams = $executeParams;
        if (isset($logParams[3])) {
            $logParams[3] = '***HIDDEN***';
        }
        error_log("Executing query: $query");
        error_log("Parameters: " . json_encode($logParams));

        $stmt = $conn->prepare($query);

        // 7. Execute with the Mapped Variables
        $executeResult = $stmt->execute($executeParams);

        // 8. Verify the operation was successful
        if (!$executeResult) {
            $errorInfo = $stmt->errorInfo();
            throw new Exception("Database execution failed: " . ($errorInfo[2] ?? 'Unknown error'));
        }

        // 9. Check if any rows were affected (insert or update)
        // Note: rowCount() can return 0 for ON DUPLICATE KEY UPDATE in some MySQL configurations
        // If execute() succeeded, the operation was successful
        $rowCount = $stmt->rowCount();
        $insertedId = $conn->lastInsertId();

        // Verify the account was actually saved by querying it back
        // Use a small delay to ensure database has processed the insert
        usleep(50000); // 0.05 second

        $verifyStmt = $conn->prepare("SELECT id, platform, account_id, account_name FROM accounts WHERE platform = ? AND account_id = ? LIMIT 1");
        $verifyStmt->execute([$platform, $accountId]);
        $existingAccount = $verifyStmt->fetch(PDO::FETCH_ASSOC);

        if (!$existingAccount) {
            // Log the attempt for debugging
            error_log("Account verification failed. Platform: $platform, Account ID: $accountId, Row Count: $rowCount, Inserted ID: $insertedId");

            // Try to get more info about what went wrong
            $checkStmt = $conn->prepare("SELECT id FROM accounts WHERE account_id = ? LIMIT 1");
            $checkStmt->execute([$accountId]);
            $anyAccount = $checkStmt->fetch(PDO::FETCH_ASSOC);

            if ($anyAccount) {
                throw new Exception("Account with this ID exists but platform mismatch. Please check your data. Platform: $platform, Account ID: $accountId");
            } else {
                throw new Exception("Account was not saved to database. Row Count: $rowCount, Inserted ID: " . ($insertedId ?: 'none') . ". Please check database constraints and try again.");
            }
        }

        echo json_encode([
            'success' => true,
            'message' => 'Account connected successfully',
            'account_id' => $existingAccount['id'],
            'rows_affected' => $rowCount,
            'debug' => [
                'platform' => $platform,
                'account_id' => $accountId,
                'inserted_id' => $insertedId
            ]
        ]);
        exit;
    }

    // --- UPDATE ACCOUNT ---
    if ($method === 'PUT') {
        $input = json_decode(file_get_contents('php://input'), true);
        if (!$input) {
            $input = $_POST;
        }

        $id = $_GET['id'] ?? $input['id'] ?? null;
        if (!$id) {
            throw new Exception("Account ID required for update");
        }

        $platform = $input['platform'] ?? null;
        $accountName = $input['account_name'] ?? $input['name'] ?? null;
        $accountId = $input['account_id'] ?? $input['platformId'] ?? null;
        $accessToken = $input['access_token'] ?? $input['accessToken'] ?? null;

        $updateFields = [];
        $updateParams = [];

        if ($platform !== null) {
            $updateFields[] = "platform = ?";
            $updateParams[] = $platform;
        }
        if ($accountName !== null) {
            $updateFields[] = "account_name = ?";
            $updateParams[] = $accountName;
        }
        if ($accountId !== null) {
            $updateFields[] = "account_id = ?";
            $updateParams[] = $accountId;
        }
        if ($accessToken !== null) {
            $updateFields[] = "access_token = ?";
            $updateParams[] = encryptToken($accessToken);
        }

        if (empty($updateFields)) {
            throw new Exception("No fields to update");
        }

        $updateFields[] = "updated_at = NOW()";
        $updateParams[] = $id;

        $query = "UPDATE accounts SET " . implode(', ', $updateFields) . " WHERE id = ?";
        $stmt = $conn->prepare($query);
        $executeResult = $stmt->execute($updateParams);

        if (!$executeResult) {
            $errorInfo = $stmt->errorInfo();
            throw new Exception("Update failed: " . ($errorInfo[2] ?? 'Unknown error'));
        }

        echo json_encode([
            'success' => true,
            'message' => 'Account updated successfully',
            'rows_affected' => $stmt->rowCount()
        ]);
        exit;
    }

    // --- DELETE ACCOUNT ---
    if ($method === 'DELETE') {
        $id = $_GET['id'] ?? null;
        if (!$id) {
            throw new Exception("Account ID required for deletion");
        }

        // Soft delete: Set is_active = 0 instead of hard delete
        $stmt = $conn->prepare("UPDATE accounts SET is_active = 0, updated_at = NOW() WHERE id = ?");
        $executeResult = $stmt->execute([$id]);

        if (!$executeResult) {
            $errorInfo = $stmt->errorInfo();
            throw new Exception("Delete failed: " . ($errorInfo[2] ?? 'Unknown error'));
        }

        $rowsAffected = $stmt->rowCount();
        if ($rowsAffected === 0) {
            throw new Exception("Account not found or already deleted");
        }

        echo json_encode([
            'success' => true,
            'message' => 'Account deleted successfully',
            'rows_affected' => $rowsAffected
        ]);
        exit;
    }
} catch (PDOException $e) {
    http_response_code(500);
    $error_message = "Database Error: " . $e->getMessage();

    // Add more context for common issues
    if (strpos($e->getMessage(), 'Column') !== false) {
        $error_message .= " | HINT: A column referenced in the query doesn't exist. Check if migrations have been run.";
    } elseif (strpos($e->getMessage(), 'Duplicate entry') !== false) {
        $error_message .= " | HINT: An account with this platform and account_id already exists.";
    }

    echo json_encode(['success' => false, 'error' => $error_message]);
} catch (Exception $e) {
    http_response_code(500);

    $error_message = $e->getMessage();

    // Check if it's a PDO/Database error and append the detailed message
    if ($stmt && $stmt->errorCode() !== '00000') {
        $error_info = $stmt->errorInfo();
        $error_message .= " | DB Error: " . $error_info[2];

        // Add a debugging hint for the most common cause (NOT NULL field missing)
        if (strpos($error_info[2], 'Column') !== false && strpos($error_info[2], 'cannot be null') !== false) {
            $error_message .= " | HINT: The database rejected a 'NULL' value for a REQUIRED column (platform, account_name, or account_id).";
        }
    }

    // Final output of the error
    echo json_encode(['success' => false, 'error' => $error_message]);
}

// Ensure the application exits after the response
exit;
