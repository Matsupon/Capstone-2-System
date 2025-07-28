<?php
return [

    'paths' => ['api/*', 'sanctum/csrf-cookie', 'login', 'register', 'logout', 'user'],

    'allowed_methods' => ['*'],

   'allowed_origins' => ['http://localhost:8081', 'http://192.168.10.47:8081'], // 👈 update this

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true,

];
