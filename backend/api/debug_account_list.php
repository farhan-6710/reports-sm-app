<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../services/FacebookAdsService.php';

// The latest token provided by the user
$accessToken = 'EAATy7qAW3EoBQZAKTc1IxSa0rPOZAx8cwcuhemdkgFdnWG37FsK2IWZAxff65hH2Rzy01BSF6JHWFTeCjAvhDViZCd81YsROLVMw2Py6pGLyZBWHoQGqjcVnWpIBnXDYI4I0S4hxi8mBjZCc68nZAZAgQBD7dWJADlBkbOxLIsqomDy9phy7wUb6Y1HUf8KkIppUIFXNkzKrc7v789pW5uLD4qke6yQ3PTzTVL04MuLhcGmfgjjbykTfEBV8cgBaGJMhD68fMUVlIUheC4RZCgqPLri0ZD';

$targetOTCId = '1945723119170714';

// 1. List Ad Accounts
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://graph.facebook.com/v18.0/me/adaccounts?fields=name,account_id,account_status&limit=100&access_token=$accessToken");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$response = curl_exec($ch);
$data = json_decode($response, true);
curl_close($ch);

$found = false;
$accounts = [];

if (isset($data['data'])) {
    foreach ($data['data'] as $acc) {
        $accounts[] = "[{$acc['account_id']}] {$acc['name']}";
        if ($acc['account_id'] == $targetOTCId) {
            $found = true;
        }
    }
}

$output = [];
$output['accessible_accounts'] = $accounts;
$output['target_id'] = $targetOTCId;
$output['found'] = $found;

if ($found) {
    // If found, let's try to fetch a simple insight to see if it works
    $svc = new FacebookAdsService($accessToken);
    try {
        $res = $svc->getCampaigns($targetOTCId, date('Y-m-d', strtotime('-30 days')), date('Y-m-d'));
        $output['fetch_test'] = (isset($res['data']) ? "SUCCESS" : "FAILED");
        if (isset($res['error']))
            $output['fetch_error'] = $res['error'];
    } catch (Exception $e) {
        $output['fetch_exception'] = $e->getMessage();
    }
} else {
    $output['reason'] = "Target ID not found in accessible accounts list.";
}

file_put_contents(__DIR__ . '/accessible_accounts.json', json_encode($output, JSON_PRETTY_PRINT));
echo "Done. Written to accessible_accounts.json\n";
?>