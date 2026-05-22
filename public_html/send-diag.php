<?php
header('Content-Type: application/json');
require_once __DIR__ . '/config.php';

$out = ['step' => 'start', 'php_version' => phpversion(), 'allow_url_fopen' => ini_get('allow_url_fopen'), 'curl_available' => function_exists('curl_init')];

// Step 1: get token
$tokenUrl = "https://login.microsoftonline.com/$tenant_id/oauth2/v2.0/token";
$tokenPost = http_build_query([
    'grant_type' => 'client_credentials',
    'client_id' => $client_id,
    'client_secret' => $client_secret,
    'scope' => 'https://graph.microsoft.com/.default'
]);

if (function_exists('curl_init')) {
    $ch = curl_init($tokenUrl);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, $tokenPost);
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/x-www-form-urlencoded']);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_TIMEOUT, 15);
    $tokenRaw = curl_exec($ch);
    $tokenHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $tokenErr = curl_error($ch);
    curl_close($ch);
    $out['token_http_code'] = $tokenHttpCode;
    $out['token_curl_err'] = $tokenErr;
    $out['token_raw_preview'] = substr($tokenRaw, 0, 400);
} else {
    $out['no_curl'] = true;
}

$tokenData = json_decode($tokenRaw, true);
if (empty($tokenData['access_token'])) {
    $out['step'] = 'token_failed';
    echo json_encode($out);
    exit;
}
$out['step'] = 'token_ok';
$out['token_prefix'] = substr($tokenData['access_token'], 0, 30) . '...';

// Step 2: try sendMail
$mailBody = json_encode([
    'message' => [
        'subject' => '[ILS DIAG] Test from send.php',
        'body' => ['contentType' => 'HTML', 'content' => 'Diagnostic test at ' . date('c')],
        'toRecipients' => [['emailAddress' => ['address' => $to_email]]]
    ]
]);

$ch = curl_init("https://graph.microsoft.com/v1.0/users/$to_email/sendMail");
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $mailBody);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $tokenData['access_token'],
    'Content-Type: application/json'
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_TIMEOUT, 15);
$mailRaw = curl_exec($ch);
$mailHttpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
$mailErr = curl_error($ch);
curl_close($ch);

$out['mail_http_code'] = $mailHttpCode;
$out['mail_curl_err'] = $mailErr;
$out['mail_raw'] = $mailRaw;
$out['step'] = 'done';
echo json_encode($out, JSON_PRETTY_PRINT);
