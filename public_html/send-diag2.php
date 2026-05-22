<?php
header('Content-Type: application/json');
require_once __DIR__ . '/config.php';

$to_user = $_GET['from'] ?? 'sales@ils-link.com';
$recipient = $_GET['to'] ?? 'sales@ils-link.com';

$tokenUrl = "https://login.microsoftonline.com/$tenant_id/oauth2/v2.0/token";
$tokenPost = http_build_query([
    'grant_type' => 'client_credentials',
    'client_id' => $client_id,
    'client_secret' => $client_secret,
    'scope' => 'https://graph.microsoft.com/.default'
]);
$ch = curl_init($tokenUrl);
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $tokenPost,
    CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 15
]);
$tokenRaw = curl_exec($ch);
curl_close($ch);
$token = json_decode($tokenRaw, true)['access_token'] ?? null;

$out = ['sending_user' => $to_user, 'recipient' => $recipient];

// 1. Check if user exists in tenant
$ch = curl_init("https://graph.microsoft.com/v1.0/users/$to_user");
curl_setopt_array($ch, [
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 10
]);
$userRaw = curl_exec($ch);
$userCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
$out['user_lookup_http'] = $userCode;
$out['user_data'] = json_decode($userRaw, true);

// 2. List mailboxes to see what users exist
$ch = curl_init("https://graph.microsoft.com/v1.0/users?$select=userPrincipalName,mail,displayName,accountEnabled&$top=10");
curl_setopt_array($ch, [
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 10
]);
$listRaw = curl_exec($ch);
curl_close($ch);
$list = json_decode($listRaw, true);
$out['tenant_users'] = array_map(function($u) {
    return ['upn' => $u['userPrincipalName'] ?? '', 'mail' => $u['mail'] ?? '', 'name' => $u['displayName'] ?? '', 'enabled' => $u['accountEnabled'] ?? null];
}, $list['value'] ?? []);

// 3. Try sending
$mailBody = json_encode([
    'message' => [
        'subject' => '[DIAG ' . date('H:i:s') . '] Test from ' . $to_user,
        'body' => ['contentType' => 'HTML', 'content' => 'Diag test at ' . date('c')],
        'toRecipients' => [['emailAddress' => ['address' => $recipient]]]
    ],
    'saveToSentItems' => true
]);
$ch = curl_init("https://graph.microsoft.com/v1.0/users/$to_user/sendMail");
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $mailBody,
    CURLOPT_HTTPHEADER => ['Authorization: Bearer ' . $token, 'Content-Type: application/json'],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 15
]);
$mailRaw = curl_exec($ch);
$mailCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
$out['send_http'] = $mailCode;
$out['send_body'] = $mailRaw;

echo json_encode($out, JSON_PRETTY_PRINT);
