<?php
return [

'paths' => ['api/*', 'sanctum/csrf-cookie', 'login', 'register', 'logout', 'user'],
'allowed_methods' => ['*'],
'allowed_origins' => ['*'], // For development only
'allowed_origins_patterns' => [],
'allowed_headers' => ['*'],
'exposed_headers' => [],
'max_age' => 0,
'supports_credentials' => true,
];// for local testing
