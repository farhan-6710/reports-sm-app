<?php
// CORS
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../config/database.php';
require_once __DIR__ . '/../services/FacebookService.php';
require_once __DIR__ . '/../services/InstagramService.php';
require_once __DIR__ . '/../middleware/auth.php';

$method = $_SERVER['REQUEST_METHOD'];
$request = $_SERVER['REQUEST_URI'];
$path = parse_url($request, PHP_URL_PATH);
$paths = explode('/', trim($path, '/'));

// Get all reports
if ($method === 'GET' && end($paths) === 'reports') {
    try {
        $db = new Database();
        $conn = $db->getConnection();
        
        $stmt = $conn->query("SELECT * FROM reports ORDER BY created_at DESC");
        $reports = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        echo json_encode([
            'success' => true,
            'data' => $reports
        ]);
    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
    exit;
}

// Generate new report
if ($method === 'POST' && end($paths) === 'reports') {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $platform = $input['platform'] ?? 'facebook';
        $platformId = $input['platformId'] ?? '';
        $startDate = $input['startDate'] ?? date('Y-m-d', strtotime('-30 days'));
        $endDate = $input['endDate'] ?? date('Y-m-d');
        $accessToken = $input['accessToken'] ?? '';
        $reportType = $input['type'] ?? 'organic';
        $preGeneratedData = $input['data'] ?? null; // For content performance reports

        $data = [];

        // If data is pre-generated (for content_performance reports), use it directly
        if ($preGeneratedData && $reportType === 'content_performance') {
            $data = is_string($preGeneratedData) ? json_decode($preGeneratedData, true) : $preGeneratedData;
        } else {
            // Otherwise, generate data from API
            switch ($platform) {
                case 'facebook':
                    $service = new FacebookService($accessToken);
                    $data = $service->getPageStats($platformId, strtotime($startDate), strtotime($endDate));
                    break;
                case 'instagram':
                    $service = new InstagramService($accessToken);
                    $data = $service->getAccountInsights($platformId, strtotime($startDate), strtotime($endDate));
                    break;
                default:
                    throw new Exception("Platform not supported");
            }
        }

        // Save to database
        $db = new Database();
        $conn = $db->getConnection();
        
        $stmt = $conn->prepare("
            INSERT INTO reports (platform, platform_id, start_date, end_date, data, type, created_at)
            VALUES (?, ?, ?, ?, ?, ?, NOW())
        ");
        
        $stmt->execute([
            $platform,
            $platformId,
            $startDate,
            $endDate,
            json_encode($data),
            $reportType
        ]);

        $reportId = $conn->lastInsertId();

        echo json_encode([
            'success' => true,
            'data' => [
                'id' => $reportId,
                'platform' => $platform,
                'dates' => ['start' => $startDate, 'end' => $endDate],
                'metrics' => $data
            ]
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
    exit;
}

// Get comparison data
if ($method === 'GET' && strpos($path, 'comparison') !== false) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $platform = $_GET['platform'] ?? 'facebook';
        $platformId = $_GET['platformId'] ?? '';
        $period = $_GET['period'] ?? 'month';
        $accessToken = $_GET['accessToken'] ?? '';

        $endDate = date('Y-m-d');
        $currentStartDate = date('Y-m-d', strtotime("-$period ago"));
        $previousStartDate = date('Y-m-d', strtotime("-2 $period ago"));
        $previousEndDate = $currentStartDate;

        // Fetch current period data
        $service = null;
        switch ($platform) {
            case 'facebook':
                $service = new FacebookService($accessToken);
                break;
            case 'instagram':
                $service = new InstagramService($accessToken);
                break;
        }

        $currentData = $service->getPageStats($platformId, strtotime($currentStartDate), strtotime($endDate));
        $previousData = $service->getPageStats($platformId, strtotime($previousStartDate), strtotime($previousEndDate));

        // Calculate growth percentages
        $comparison = calculateGrowth($previousData['organic'], $currentData['organic']);

        echo json_encode([
            'success' => true,
            'data' => [
                'current' => $currentData,
                'previous' => $previousData,
                'growth' => $comparison
            ]
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
    exit;
}

function calculateGrowth($previous, $current) {
    $growth = [];
    foreach ($current as $key => $value) {
        $prevValue = $previous[$key] ?? 0;
        if ($prevValue > 0) {
            $growth[$key] = round((($value - $prevValue) / $prevValue) * 100, 2);
        } else {
            $growth[$key] = $value > 0 ? 100 : 0;
        }
    }
    return $growth;
}

// Delete report
if ($method === 'DELETE') {
    try {
        $reportId = $_GET['id'] ?? '';
        
        if (empty($reportId)) {
            throw new Exception("Report ID required");
        }

        $db = new Database();
        $conn = $db->getConnection();
        
        $stmt = $conn->prepare("DELETE FROM reports WHERE id = ?");
        $stmt->execute([$reportId]);

        echo json_encode([
            'success' => true,
            'message' => 'Report deleted successfully'
        ]);

    } catch (Exception $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
    exit;
}

http_response_code(404);
echo json_encode(['success' => false, 'error' => 'Endpoint not found']);
?>

