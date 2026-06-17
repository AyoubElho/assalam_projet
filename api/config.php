<?php
declare(strict_types=1);

const DB_HOST = '127.0.0.1';
const DB_NAME = 'certificat_db';
const DB_USER = 'root';
const DB_PASS = '';
const DB_CHARSET = 'utf8mb4';

const APP_USERS = [
    'admin' => [
        'password_hash' => '$2y$10$WJ5Diip8Iq0mmATmv/vkxekLKYxalh5hE/MfE7Q0px8ZKJjdEid/y', // password: admin123
        'role' => 'admin',
    ],
    'writer' => [
        'password_hash' => '$2y$10$fXeisi3x9q77.hTGAXyEbOgr0UC.ST.GbfXJZcghivFHOcltbhWg6', // password: writer123
        'role' => 'writer',
    ],
];
