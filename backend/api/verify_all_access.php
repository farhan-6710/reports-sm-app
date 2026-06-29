<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../services/FacebookAdsService.php';
require_once __DIR__ . '/../services/InstagramService.php'; // Assuming this exists for page checks

// The Token
$accessToken = 'EAATy7qAW3EoBQRknZBuIoEyQTqfaKZBUyRG8LFfz5J66Kk77vNUFp72XH9ZA5T5FfqmJ4nnXqOGZBMBT4ZBQI7CZCHIpowJZAY2vfCFDe8tVDG21fXrSsxUmKWOpDPC1ylSn9bSZBwt3U0sns1sgRTZAKKlXdARKF1FDrwnubNQCV3blz0bdZAbyDSJ3UNLKtRAeGRZBXZBy8xYcszcb6FckiAQkwkaf5VXfO7ioAsfRd2kP9Tu1bMfiZAPzpb1n0rX8DhLpAboJDpUT9u2qavsrfYVJQ';

$adService = new FacebookAdsService($accessToken);

echo "--- BATCH CERTIFICATION START ---\n";

// 1. Get All Accessible Accounts
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://graph.facebook.com/v18.0/me/adaccounts?fields=name,account_id,currency,account_status,business_name&limit=100&access_token=$accessToken");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response = curl_exec($ch);
$data = json_decode($response, true);
curl_close($ch);

$report = [];

if (isset($data['data'])) {
    foreach ($data['data'] as $acc) {
        $id = $acc['account_id'];
        $name = $acc['name'];
        $item = [
            'id' => $id,
            'name' => $name,
            'status' => 'Testing...'
        ];

        // TEST 1: Fetch Campaigns (Data Check)
        try {
            $campaigns = $adService->getCampaigns($id, date('Y-m-d', strtotime('-90 days')), date('Y-m-d'));
            if (isset($campaigns['data'])) {
                $item['campaigns_found'] = count($campaigns['data']);
                $item['fetch_status'] = '✅ OK';
            } else {
                $item['fetch_status'] = '⚠️ EMPTY or ERROR';
                $item['raw_error'] = json_encode($campaigns);
            }
        } catch (Exception $e) {
            $item['fetch_status'] = '❌ EXCEPTION';
            $item['error_msg'] = $e->getMessage();
        }

        $report[] = $item;
    }
} else {
    echo "CRITICAL: Could not fetch ad accounts.\n";
    print_r($data);
}

// Output Results
file_put_contents(__DIR__ . '/certification_results.json', json_encode($report, JSON_PRETTY_PRINT));
echo "Certified " . count($report) . " accounts. Results in certification_results.json\n";
?>