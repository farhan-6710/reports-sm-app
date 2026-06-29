<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../services/InstagramService.php';
require_once __DIR__ . '/../services/FacebookService.php';
require_once __DIR__ . '/../services/FacebookAdsService.php';

// NEWEST Token provided by user
$accessToken = 'EAATy7qAW3EoBQZAKTc1IxSa0rPOZAx8cwcuhemdkgFdnWG37FsK2IWZAxff65hH2Rzy01BSF6JHWFTeCjAvhDViZCd81YsROLVMw2Py6pGLyZBWHoQGqjcVnWpIBnXDYI4I0S4hxi8mBjZCc68nZAZAgQBD7dWJADlBkbOxLIsqomDy9phy7wUb6Y1HUf8KkIppUIFXNkzKrc7v789pW5uLD4qke6yQ3PTzTVL04MuLhcGmfgjjbykTfEBV8cgBaGJMhD68fMUVlIUheC4RZCgqPLri0ZD';

// Client Data
$clients = [
    'Sorshe' => [
        'ig' => '17841468287822961',
        'fb' => '383144891553821',
        'ad' => '767631601408575'
    ],
    'OTC' => [
        'ig' => '17841453683516805',
        'fb' => '101969355902880',
        'ad' => '1945723119170714'
    ],
    'Veda Hospitals' => [
        'ig' => '17841453444665050',
        'fb' => '110537261694639',
        'ad' => '1448640106038864'
    ],
    'Bikanervala' => [
        'ig' => '17841475134353704',
        'fb' => '108833912509075',
        'ad' => '9586283778155853'
    ],
    'Tales Of Telugu' => [
        'ig' => '17841462313251691',
        'fb' => '684385048091691',
        'ad' => '1952983582156419'
    ],
    'Armario Pro' => [
        'ig' => '17841476214409160',
        'fb' => '702416986295139',
        'ad' => '1389344766087270'
    ]
];

$results = [
    'token_check' => [],
    'clients' => [],
    'accessible_ad_accounts' => [] // New: List what IS accessible
];

// Initialize Services
$fbService = new FacebookService($accessToken);
$igService = new InstagramService($accessToken);
$adService = new FacebookAdsService($accessToken);

// 1. Check Permissions Global
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://graph.facebook.com/v18.0/me/permissions?access_token=$accessToken");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$resp = curl_exec($ch);
$permsData = json_decode($resp, true);
curl_close($ch);

$granted = [];
if (isset($permsData['data'])) {
    foreach ($permsData['data'] as $p) {
        if ($p['status'] === 'granted')
            $granted[] = $p['permission'];
    }
}
$results['token_check']['granted_permissions'] = $granted;

// 2. List Accessible Ad Accounts (Reference)
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, "https://graph.facebook.com/v18.0/me/adaccounts?fields=name,account_id&limit=50&access_token=$accessToken");
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
$resp = curl_exec($ch);
$accData = json_decode($resp, true);
curl_close($ch);

if (isset($accData['data'])) {
    foreach ($accData['data'] as $acc) {
        $results['accessible_ad_accounts'][] = $acc['account_id'] . " (" . $acc['name'] . ")";
    }
}

// 3. Iterate Clients
foreach ($clients as $name => $ids) {
    $clientResult = ['status' => 'init'];

    // --- Instagram ---
    if ($ids['ig']) {
        try {
            $igInfo = $igService->getAccountInfo($ids['ig']);
            if (isset($igInfo['error']))
                $clientResult['ig'] = "ERROR: " . $igInfo['error']['message'];
            else
                $clientResult['ig'] = "SUCCESS: " . ($igInfo['username'] ?? 'OK');
        } catch (Exception $e) {
            $clientResult['ig'] = "EXCEPTION: " . $e->getMessage();
        }
    } else {
        $clientResult['ig'] = "N/A";
    }

    // --- Facebook Page ---
    if ($ids['fb']) {
        try {
            $fbInfo = $fbService->getPageInfo($ids['fb']);
            if (isset($fbInfo['error']))
                $clientResult['fb'] = "ERROR: " . $fbInfo['error']['message'];
            else
                $clientResult['fb'] = "SUCCESS: " . ($fbInfo['name'] ?? 'OK');
        } catch (Exception $e) {
            $clientResult['fb'] = "EXCEPTION: " . $e->getMessage();
        }
    } else {
        $clientResult['fb'] = "N/A";
    }

    // --- Ad Account ---
    if ($ids['ad']) {
        try {
            $adInfo = $adService->getAdAccountInfo($ids['ad']);
            if (isset($adInfo['error']))
                $clientResult['ad'] = "ERROR: " . $adInfo['error']['message'];
            else
                $clientResult['ad'] = "SUCCESS: " . ($adInfo['name'] ?? 'OK');
        } catch (Exception $e) {
            $clientResult['ad'] = "EXCEPTION: " . $e->getMessage();
        }
    } else {
        $clientResult['ad'] = "N/A";
    }

    $results['clients'][$name] = $clientResult;
}

file_put_contents(__DIR__ . '/new_token_result.json', json_encode($results, JSON_PRETTY_PRINT));
echo "Done.\n";
?>