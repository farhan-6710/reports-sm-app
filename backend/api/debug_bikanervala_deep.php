<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../services/FacebookAdsService.php';

$accessToken = 'EAATy7qAW3EoBQRknZBuIoEyQTqfaKZBUyRG8LFfz5J66Kk77vNUFp72XH9ZA5T5FfqmJ4nnXqOGZBMBT4ZBQI7CZCHIpowJZAY2vfCFDe8tVDG21fXrSsxUmKWOpDPC1ylSn9bSZBwt3U0sns1sgRTZAKKlXdARKF1FDrwnubNQCV3blz0bdZAbyDSJ3UNLKtRAeGRZBXZBy8xYcszcb6FckiAQkwkaf5VXfO7ioAsfRd2kP9Tu1bMfiZAPzpb1n0rX8DhLpAboJDpUT9u2qavsrfYVJQ';

$bikaId = '1035923761853197';
$svc = new FacebookAdsService($accessToken);

// Match the user's report date range
$start = '2025-12-08';
$end = '2026-01-07';

echo "--- DATA VERIFICATION START ---\n";
echo "Range: $start to $end\n";

$campaigns = $svc->getCampaigns($bikaId, $start, $end);

$totalSpend = 0;
$totalImpr = 0;
$activeCount = 0;

if (isset($campaigns['data'])) {
    foreach ($campaigns['data'] as $c) {
        $name = $c['name'];
        $status = $c['status'];

        $insights = $c['insights']['data'][0] ?? null;

        if ($insights) {
            $spend = $insights['spend'] ?? 0;
            $impr = $insights['impressions'] ?? 0;

            $totalSpend += $spend;
            $totalImpr += $impr;

            if ($spend > 0 || $impr > 0) {
                echo "✅ FOUND DATA: [$name] Status=$status | Spend=$spend | Impr=$impr\n";
                $activeCount++;
            } else {
                // echo "   (Zero data: $name)\n";
            }
        } else {
            // echo "   (No insights: $name)\n";
        }
    }
}

echo "---------------------------\n";
echo "SUMMARY:\n";
echo "Campaigns with Data: $activeCount\n";
echo "Total Spend: $totalSpend\n";
echo "Total Impressions: $totalImpr\n";

if ($totalSpend == 0 && $totalImpr == 0) {
    echo "⚠️ CONCLUSION: The account genuinely has NO DATA for this period.\n";
} else {
    echo "🔴 CONCLUSION: Data EXISTS ($totalSpend spend), but Report shows 0. BUG IN REPORT LOGIC.\n";
}
echo "---------------------------\n";
?>