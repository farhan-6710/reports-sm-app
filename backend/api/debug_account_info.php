<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../services/FacebookAdsService.php';

$accessToken = 'EAATy7qAW3EoBQRknZBuIoEyQTqfaKZBUyRG8LFfz5J66Kk77vNUFp72XH9ZA5T5FfqmJ4nnXqOGZBMBT4ZBQI7CZCHIpowJZAY2vfCFDe8tVDG21fXrSsxUmKWOpDPC1ylSn9bSZBwt3U0sns1sgRTZAKKlXdARKF1FDrwnubNQCV3blz0bdZAbyDSJ3UNLKtRAeGRZBXZBy8xYcszcb6FckiAQkwkaf5VXfO7ioAsfRd2kP9Tu1bMfiZAPzpb1n0rX8DhLpAboJDpUT9u2qavsrfYVJQ';
$bikaId = '1035923761853197';

$svc = new FacebookAdsService($accessToken);

echo "--- TESTING ACCOUNT INFO FETCH ---\n";
try {
    // This method is likely what campaign_report.php calls first
    $info = $svc->getAdAccountInfo($bikaId);
    echo "✅ Success! Name: " . ($info['name'] ?? 'Unknown') . "\n";
    print_r($info);
} catch (Exception $e) {
    echo "❌ FAILED: " . $e->getMessage() . "\n";
}
echo "---------------------------------\n";
?>