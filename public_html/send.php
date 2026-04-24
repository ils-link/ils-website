<?php
header('Content-Type: application/json');
$tenant_id     = '2ffacc06-2e65-4164-985c-623385be9ccf';
$client_id     = '1fdcd81b-cc2d-444f-93f9-5a07967fc482';
$client_secret = 'REMOVED';
$to_email      = 'sales@ils-link.com';

function clean($d){ return htmlspecialchars(strip_tags(trim($d)), ENT_QUOTES, 'UTF-8'); }

// Pretty labels for known fields (French)
$labels = [
    'name' => 'Nom',
    'company' => 'Entreprise',
    'organisation' => 'Organisation',
    'country' => 'Pays',
    'email' => 'Email',
    'phone' => 'Téléphone',
    'division' => 'Division',
    'subject' => 'Sujet',
    'message' => 'Message',
    'description' => 'Description',
    'products-needed' => 'Produits recherchés',
    'service-type' => 'Type de service',
    'service-needed' => 'Service recherché',
    'equipment-type' => 'Type d\'équipement',
    'brands-interest' => 'Marques d\'intérêt',
    'quantity' => 'Quantité',
    'budget' => 'Budget',
    'timeline' => 'Délai',
    'instruments' => 'Instruments',
    'location' => 'Localisation',
    'notes' => 'Notes',
    'frequency' => 'Fréquence'
];

// Identify origin page from Referer
$referer = $_SERVER['HTTP_REFERER'] ?? '';
$page = 'ils-link.com';
if (preg_match('#/([^/?#]+\.html)#', $referer, $m)) {
    $page = $m[1];
} elseif (preg_match('#ils-link\.com/?$#', $referer)) {
    $page = 'index.html';
}
$pageLabel = str_replace(['.html', '-'], ['', ' '], $page);
$pageLabel = ucfirst(trim($pageLabel));

// Build subject
$name = clean($_POST['name'] ?? 'Contact anonyme');
$userSubject = clean($_POST['subject'] ?? '');
if ($userSubject) {
    $subject = "[ILS $pageLabel] $userSubject — $name";
} else {
    $subject = "[ILS $pageLabel] Nouveau contact — $name";
}

// Build HTML body dynamically from ALL POST fields
$body  = "<h2 style='color:#0A1628;margin-bottom:8px;'>Nouveau contact depuis <span style='color:#C9A55C;'>$pageLabel</span></h2>";
$body .= "<p style='color:#555;margin-top:0;'>Source: <a href='" . htmlspecialchars($referer, ENT_QUOTES, 'UTF-8') . "'>" . htmlspecialchars($referer, ENT_QUOTES, 'UTF-8') . "</a></p>";
$body .= "<table style='border-collapse:collapse;width:100%;margin-top:16px;font-family:Arial,sans-serif;'>";

$rowStyleLabel = "padding:10px;border:1px solid #ddd;background:#f8f7f4;font-weight:bold;color:#0A1628;width:35%;vertical-align:top;";
$rowStyleVal   = "padding:10px;border:1px solid #ddd;vertical-align:top;";

foreach ($_POST as $key => $raw) {
    // Skip honey-pot or technical fields
    if (in_array($key, ['honeypot', '_token', 'csrf'])) continue;

    // Handle array values (checkboxes, multi-selects)
    if (is_array($raw)) {
        $val = implode(', ', array_map(function($v) { return clean($v); }, $raw));
    } else {
        $val = clean($raw);
    }
    if ($val === '') continue;

    $label = $labels[$key] ?? ucfirst(str_replace(['-', '_'], ' ', $key));

    // Message field: multi-line, so use nl2br
    if ($key === 'message' || $key === 'description' || $key === 'notes') {
        $val = nl2br($val);
    }

    $body .= "<tr><td style='$rowStyleLabel'>$label</td><td style='$rowStyleVal'>$val</td></tr>";
}

$body .= "</table>";
$body .= "<p style='color:#888;font-size:12px;margin-top:24px;'>Envoyé le " . date('d/m/Y H:i:s') . " depuis ils-link.com</p>";

$email = clean($_POST['email'] ?? '');

// 1. Get OAuth token
$tokenPost = http_build_query([
    'grant_type' => 'client_credentials',
    'client_id' => $client_id,
    'client_secret' => $client_secret,
    'scope' => 'https://graph.microsoft.com/.default'
]);
$ch = curl_init("https://login.microsoftonline.com/$tenant_id/oauth2/v2.0/token");
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => $tokenPost,
    CURLOPT_HTTPHEADER => ['Content-Type: application/x-www-form-urlencoded'],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 15
]);
$tokenRaw = curl_exec($ch);
$tokenHttp = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
$tokenData = json_decode($tokenRaw, true);
if (empty($tokenData['access_token'])) {
    echo json_encode(['success' => false, 'error' => 'token', 'http' => $tokenHttp]);
    exit;
}
$token = $tokenData['access_token'];

// 2. Build mail payload
$mailPayload = [
    'message' => [
        'subject' => $subject,
        'body' => ['contentType' => 'HTML', 'content' => $body],
        'toRecipients' => [['emailAddress' => ['address' => $to_email]]],
    ],
    'saveToSentItems' => true
];
if ($email && filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $mailPayload['message']['replyTo'] = [['emailAddress' => ['address' => $email, 'name' => $name]]];
}

// 3. POST to Graph sendMail
$ch = curl_init("https://graph.microsoft.com/v1.0/users/$to_email/sendMail");
curl_setopt_array($ch, [
    CURLOPT_POST => true,
    CURLOPT_POSTFIELDS => json_encode($mailPayload, JSON_UNESCAPED_UNICODE),
    CURLOPT_HTTPHEADER => [
        'Authorization: Bearer ' . $token,
        'Content-Type: application/json'
    ],
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 15
]);
$mailRaw = curl_exec($ch);
$mailHttp = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($mailHttp === 202) {
    echo json_encode(['success' => true]);
} else {
    $err = json_decode($mailRaw, true);
    echo json_encode([
        'success' => false,
        'error' => $err['error']['message'] ?? 'HTTP ' . $mailHttp,
        'code' => $err['error']['code'] ?? null
    ]);
}
