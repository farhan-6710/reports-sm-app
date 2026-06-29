<?php
require_once __DIR__ . '/../config/config.php';
require_once __DIR__ . '/../services/InstagramService.php';
require_once __DIR__ . '/../services/FacebookService.php';
require_once __DIR__ . '/../services/FacebookAdsService.php';

// New Token
$accessToken = 'EAATy7qAW3EoBQcDqvD0sjKytnpyK4CNUr1ZCo2JJeMRTZBWfDLUyty9XbZAC6lIsqFA3iXFM3U8g4yRBeQlTR8wABUSJZBA48kSQC15LtvWBvY2b8x4a9utewc5tblTZAkj1z1jGeo8QgAZAPoQ3TQwOuLPpbYaGYcNHu0mZBcgZBugP1mo9u87S9mu3ZCKpTYSkTS9HDYLRJjhJQQXFOTN7d0CSRbJzsDgywpQb7IofqWo9MOyhEP51IUVZBGmo1CkZA34hFdUwE8yrS4ddkCl3RWr8AZDZD';

// Client Data from Image
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
    'clients' => []
];

// Initialize Services
$fbService = new FacebookService($accessToken);
$igService = new InstagramService($accessToken);
$adService = new FacebookAdsService($accessToken);

// 1. Check Permissions Global
echo "Checking Token Permissions...\n";
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

// 2. Iterate Clients
foreach ($clients as $name => $ids) {
    echo "Testing $name...\n";
    $clientResult = ['status' => 'ok', 'errors' => []];

    // --- Instagram ---
    try {
        if ($ids['ig']) {
            $igInfo = $igService->getAccountInfo($ids['ig']);
            if (isset($igInfo['error']))
                $clientResult['errors']['ig'] = $igInfo['error']['message'];
            else
                $clientResult['ig_success'] = true;
        }
    } catch (Exception $e) {
        $clientResult['errors']['ig'] = $e->getMessage();
    }

    // --- Facebook Page ---
    try {
        if ($ids['fb']) {
            $fbInfo = $fbService->getPageInfo($ids['fb']);
            if (isset($fbInfo['error']))
                $clientResult['errors']['fb'] = $fbInfo['error']['message'];
            else
                $clientResult['fb_success'] = true;
        }
    } catch (Exception $e) {
        $clientResult['errors']['fb'] = $e->getMessage();
    }

    // --- Ad Account ---
    try {
        if ($ids['ad']) {
            $adInfo = $adService->getAdAccountInfo($ids['ad']);
            // The service returns the data directly or throws exception usually, but let's check structure
            if (isset($adInfo['error'])) {
                $clientResult['errors']['ad'] = $adInfo['error']['message'];
            } else {
                $clientResult['ad_success'] = true;
                $clientResult['ad_currency'] = $adInfo['currency'] ?? 'N/A';
            }
        }
    } catch (Exception $e) {
        $clientResult['errors']['ad'] = $e->getMessage();
    }

    $results['clients'][$name] = $clientResult;
}

file_put_contents(__DIR__ . '/new_credentials_result.json', json_encode($results, JSON_PRETTY_PRINT));
echo "Done. Results written to new_credentials_result.json\n";
?>