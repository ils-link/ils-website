<?php
// Credentials Azure — chargés depuis les variables d'environnement
// Ce fichier est exclu de git (.gitignore)
$tenant_id     = getenv('AZURE_TENANT_ID')     ?: '';
$client_id     = getenv('AZURE_CLIENT_ID')     ?: '';
$client_secret = getenv('AZURE_CLIENT_SECRET') ?: '';
$to_email      = 'sales@ils-link.com';
