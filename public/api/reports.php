<?php
// ---
// Summary:
// - Purpose: REST API endpoint for managing maintenance report save files backed by JSON storage and discrete image files
// - Role: Backend API handler
// - Depends on: PHP 8.0+, data/reports/
// - Key Responsibilities: List, read, save, create project reports, upload/delete discrete image files, and migrate base64 to files
// - Notes: Eliminates payload bloat by decoupling binary image assets from JSON document metadata
// ---

ini_set('memory_limit', '256M');
ini_set('post_max_size', '100M');
ini_set('upload_max_filesize', '100M');

header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Accept, X-Sync-Key');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('Expires: 0');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

$dataDir = __DIR__ . '/../data/reports';
if (!is_dir($dataDir)) {
    mkdir($dataDir, 0777, true);
}

$locksDir = __DIR__ . '/../data/locks';
if (!is_dir($locksDir)) {
    mkdir($locksDir, 0777, true);
}

const LOCK_TTL_SECONDS = 10;
const DEFAULT_SYNC_KEY = 'solar-sync-2026';

function resolveExpectedSyncKey(string $baseDataDir): string {
    $keyFile = $baseDataDir . '/sync_key.txt';
    if (file_exists($keyFile)) {
        $fileKey = trim((string)@file_get_contents($keyFile));
        if ($fileKey !== '') return $fileKey;
    }
    $envKey = trim((string)(getenv('SOLAR_SYNC_KEY') ?: ''));
    if ($envKey !== '') return $envKey;
    return DEFAULT_SYNC_KEY;
}

function appendSyncLog(string $baseDataDir, string $action, string $status, string $detail = ''): void {
    $logFile = $baseDataDir . '/sync_log.json';
    $logs = [];
    if (file_exists($logFile)) {
        $raw = readFileLocked($logFile);
        $decoded = $raw !== false ? json_decode($raw, true) : null;
        if (is_array($decoded)) {
            $logs = $decoded;
        }
    }
    array_unshift($logs, [
        'timestamp' => date('Y-m-d H:i:s'),
        'action' => $action,
        'status' => $status,
        'ip' => $_SERVER['REMOTE_ADDR'] ?? '',
        'userAgent' => substr((string)($_SERVER['HTTP_USER_AGENT'] ?? ''), 0, 120),
        'detail' => $detail,
    ]);
    $logs = array_slice($logs, 0, 50);
    writeFileAtomic($logFile, json_encode($logs, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES));
}

function verifySyncAccess(string $baseDataDir, string $actionName): void {
    $expected = resolveExpectedSyncKey($baseDataDir);
    $provided = trim((string)($_SERVER['HTTP_X_SYNC_KEY'] ?? ($_GET['syncKey'] ?? '')));
    if ($provided === '' || !hash_equals($expected, $provided)) {
        appendSyncLog($baseDataDir, $actionName, 'rejected', 'Sync key tidak valid atau kosong');
        http_response_code(403);
        echo json_encode(['error' => 'Sync key tidak valid.']);
        exit;
    }
}

function readNormalizedLockState(string $locksDir, string $reportId): ?array {
    if ($reportId === '') return null;
    $lockFile = $locksDir . '/' . $reportId . '.json';
    if (!file_exists($lockFile)) return null;
    $raw = readFileLocked($lockFile);
    if ($raw === false) return null;
    $lock = json_decode($raw, true);
    if (!is_array($lock)) return null;

    $now = time();
    $activeDevices = [];
    if (!empty($lock['activeDevices']) && is_array($lock['activeDevices'])) {
        foreach ($lock['activeDevices'] as $entry) {
            if (!is_array($entry) || empty($entry['deviceId'])) continue;
            if ((int)($entry['expiresAt'] ?? 0) <= $now) continue;
            $dId = (string)$entry['deviceId'];
            $activeDevices[$dId] = [
                'deviceId' => $dId,
                'deviceName' => (string)($entry['deviceName'] ?? 'Perangkat'),
                'ip' => (string)($entry['ip'] ?? ''),
                'role' => (string)($entry['role'] ?? 'viewer'),
                'lastSeenAt' => (int)($entry['lastSeenAt'] ?? $now),
                'expiresAt' => (int)($entry['expiresAt'] ?? 0),
            ];
        }
    }

    $hasMainLock = !empty($lock['deviceId']) && (int)($lock['expiresAt'] ?? 0) > $now;
    $mainDeviceId = $hasMainLock ? (string)$lock['deviceId'] : '';

    if ($hasMainLock && !isset($activeDevices[$mainDeviceId])) {
        $activeDevices[$mainDeviceId] = [
            'deviceId' => $mainDeviceId,
            'deviceName' => (string)($lock['deviceName'] ?? 'Perangkat'),
            'ip' => (string)($lock['ip'] ?? ''),
            'role' => 'editor',
            'lastSeenAt' => (int)($lock['acquiredAt'] ?? $now),
            'expiresAt' => (int)($lock['expiresAt'] ?? 0),
        ];
    }

    if (!$hasMainLock && empty($activeDevices)) {
        @unlink($lockFile);
        return null;
    }

    return [
        'deviceId' => $mainDeviceId,
        'deviceName' => $hasMainLock ? (string)($lock['deviceName'] ?? 'Perangkat') : '',
        'ip' => $hasMainLock ? (string)($lock['ip'] ?? '') : '',
        'acquiredAt' => $hasMainLock ? (int)($lock['acquiredAt'] ?? 0) : 0,
        'expiresAt' => $hasMainLock ? (int)($lock['expiresAt'] ?? 0) : 0,
        'activeDevices' => $activeDevices,
    ];
}

function readActiveLock(string $locksDir, string $reportId): ?array {
    $state = readNormalizedLockState($locksDir, $reportId);
    if ($state === null || $state['deviceId'] === '') return null;
    return [
        'deviceId' => $state['deviceId'],
        'deviceName' => $state['deviceName'],
        'ip' => $state['ip'],
        'acquiredAt' => $state['acquiredAt'],
        'expiresAt' => $state['expiresAt'],
    ];
}

function formatActiveDevicesSummary(?array $lockState): array {
    $summary = [];
    if ($lockState === null || empty($lockState['activeDevices']) || !is_array($lockState['activeDevices'])) {
        return $summary;
    }
    foreach ($lockState['activeDevices'] as $dev) {
        $summary[] = [
            'deviceId' => $dev['deviceId'],
            'deviceName' => $dev['deviceName'],
            'role' => $dev['role'],
            'lastSeenAt' => $dev['lastSeenAt'],
        ];
    }
    usort($summary, function ($a, $b) {
        if ($a['role'] !== $b['role']) {
            return $a['role'] === 'editor' ? -1 : 1;
        }
        return strcmp($a['deviceName'], $b['deviceName']);
    });
    return $summary;
}

function isLockedByOtherDevice(string $locksDir, string $reportId, string $deviceId): ?array {
    if ($deviceId === '' || $reportId === '') return null;
    $lock = readActiveLock($locksDir, $reportId);
    if ($lock !== null && $lock['deviceId'] !== $deviceId) {
        return $lock;
    }
    return null;
}

function sanitizeId(string $raw): string {
    $clean = preg_replace('/[^a-zA-Z0-9_-]/', '_', trim($raw));
    return trim($clean, '_');
}

// readers hold a shared lock so they never see a half-written file
function readFileLocked(string $filePath) {
    $fp = @fopen($filePath, 'rb');
    if ($fp === false) {
        return false;
    }
    flock($fp, LOCK_SH);
    $contents = stream_get_contents($fp);
    flock($fp, LOCK_UN);
    fclose($fp);
    return $contents;
}

// temp file plus rename keeps the old JSON intact until the new one is complete
function writeFileAtomic(string $filePath, string $contents): bool {
    $tmp = tempnam(dirname($filePath), 'wr_');
    if ($tmp === false) {
        return false;
    }
    if (file_put_contents($tmp, $contents, LOCK_EX) === false) {
        @unlink($tmp);
        return false;
    }
    @chmod($tmp, 0644);
    if (!rename($tmp, $filePath)) {
        @unlink($tmp);
        return false;
    }
    return true;
}

$method = $_SERVER['REQUEST_METHOD'];

if ($method === 'GET') {
    $getAction = $_GET['action'] ?? '';
    $baseDataDir = __DIR__ . '/../data';

    if ($getAction === 'sync_manifest') {
        verifySyncAccess($baseDataDir, 'sync_manifest');
        if (extension_loaded('zlib') && !ini_get('zlib.output_compression') && !ob_get_level()) {
            @ob_start('ob_gzhandler');
        }

        $manifestReports = [];
        $manifestImages = [];

        $files = glob($dataDir . '/*.json') ?: [];
        foreach ($files as $file) {
            $fileId = basename($file, '.json');
            $mtime = filemtime($file) ?: 0;
            $rawContent = readFileLocked($file);
            $decoded = $rawContent !== false ? json_decode($rawContent, true) : null;
            $lokasi = is_array($decoded) ? ($decoded['location']['lokasi'] ?? '') : '';
            $name = is_array($decoded) ? ($decoded['name'] ?? str_replace('_', ' ', $fileId)) : $fileId;

            $manifestReports[] = [
                'id' => $fileId,
                'name' => $name,
                'lokasi' => $lokasi,
                'sizeBytes' => $rawContent !== false ? strlen($rawContent) : (filesize($file) ?: 0),
                'updatedAt' => date('Y-m-d H:i:s', $mtime),
                'md5' => $rawContent !== false ? md5($rawContent) : (md5_file($file) ?: ''),
            ];
        }

        $dirs = glob($dataDir . '/*', GLOB_ONLYDIR) ?: [];
        foreach ($dirs as $dirPath) {
            $dirReportId = basename($dirPath);
            $entries = @scandir($dirPath);
            if (!is_array($entries)) continue;
            foreach ($entries as $entryName) {
                if ($entryName === '.' || $entryName === '..') continue;
                if (!preg_match('/\.(jpe?g|png|webp)$/i', $entryName)) continue;
                $fullImgPath = $dirPath . '/' . $entryName;
                $imgSize = @filesize($fullImgPath);
                if ($imgSize === false) continue;

                $manifestImages[] = [
                    'reportId' => $dirReportId,
                    'fileName' => $entryName,
                    'sizeBytes' => $imgSize,
                ];
            }
        }

        usort($manifestReports, static fn($a, $b) => strcmp($b['updatedAt'], $a['updatedAt']));
        appendSyncLog(
            $baseDataDir,
            'sync_manifest',
            'ok',
            count($manifestReports) . ' laporan, ' . count($manifestImages) . ' gambar'
        );

        echo json_encode([
            'serverTime' => date('Y-m-d H:i:s'),
            'totalReports' => count($manifestReports),
            'totalImages' => count($manifestImages),
            'reports' => $manifestReports,
            'images' => $manifestImages,
        ], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($getAction === 'sync_image_hashes') {
        verifySyncAccess($baseDataDir, 'sync_image_hashes');
        if (extension_loaded('zlib') && !ini_get('zlib.output_compression') && !ob_get_level()) {
            @ob_start('ob_gzhandler');
        }
        $rawIds = trim((string)($_GET['reportIds'] ?? ''));
        $ids = array_values(array_filter(array_map('sanitizeId', explode(',', $rawIds))));
        $hashes = [];

        foreach (array_slice($ids, 0, 20) as $rId) {
            $dirPath = $dataDir . '/' . $rId;
            if (!is_dir($dirPath)) continue;
            $entries = @scandir($dirPath);
            if (!is_array($entries)) continue;
            $reportHashes = [];
            foreach ($entries as $entryName) {
                if ($entryName === '.' || $entryName === '..') continue;
                if (!preg_match('/\.(jpe?g|png|webp)$/i', $entryName)) continue;
                $fullImgPath = $dirPath . '/' . $entryName;
                $hash = @md5_file($fullImgPath);
                if ($hash === false) continue;
                $reportHashes[$entryName] = $hash;
            }
            $hashes[$rId] = $reportHashes;
        }

        echo json_encode(['hashes' => $hashes], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($getAction === 'sync_file') {
        verifySyncAccess($baseDataDir, 'sync_file');
        $type = $_GET['type'] ?? '';
        $reportId = sanitizeId($_GET['reportId'] ?? '');
        if ($reportId === '') {
            http_response_code(400);
            echo json_encode(['error' => 'reportId tidak valid.']);
            exit;
        }

        if ($type === 'json') {
            $targetJson = $dataDir . '/' . $reportId . '.json';
            if (!is_file($targetJson)) {
                http_response_code(404);
                echo json_encode(['error' => 'JSON laporan tidak ditemukan.']);
                exit;
            }
            $content = readFileLocked($targetJson);
            if ($content === false) {
                http_response_code(500);
                echo json_encode(['error' => 'Gagal membaca JSON laporan.']);
                exit;
            }
            echo $content;
            exit;
        }

        if ($type === 'image') {
            $fileName = basename((string)($_GET['file'] ?? ''));
            if (!preg_match('/^[a-zA-Z0-9_.-]+\.(jpe?g|png|webp)$/i', $fileName)) {
                http_response_code(400);
                echo json_encode(['error' => 'Nama berkas gambar tidak valid.']);
                exit;
            }
            $targetImg = $dataDir . '/' . $reportId . '/' . $fileName;
            if (!is_file($targetImg)) {
                http_response_code(404);
                echo json_encode(['error' => 'Berkas gambar tidak ditemukan.']);
                exit;
            }
            $ext = strtolower(pathinfo($fileName, PATHINFO_EXTENSION));
            $mime = $ext === 'png' ? 'image/png' : ($ext === 'webp' ? 'image/webp' : 'image/jpeg');
            header('Content-Type: ' . $mime);
            header('Content-Length: ' . filesize($targetImg));
            readfile($targetImg);
            exit;
        }

        http_response_code(400);
        echo json_encode(['error' => 'Parameter type harus json atau image.']);
        exit;
    }

    if ($getAction === 'active_devices') {
        $lockFiles = glob($locksDir . '/*.json') ?: [];
        $activeDevicesByReport = [];
        foreach ($lockFiles as $lockFile) {
            $reportId = basename($lockFile, '.json');
            $lockState = readNormalizedLockState($locksDir, $reportId);
            if ($lockState === null) continue;
            $summary = formatActiveDevicesSummary($lockState);
            if (!empty($summary)) {
                $activeDevicesByReport[$reportId] = [
                    'activeDeviceCount' => count($summary),
                    'activeDevices' => $summary,
                ];
            }
        }
        echo json_encode(['activeDevicesByReport' => $activeDevicesByReport], JSON_UNESCAPED_SLASHES);
        exit;
    }

    if ($getAction === 'sync_logs') {
        verifySyncAccess($baseDataDir, 'sync_logs');
        $logFile = $baseDataDir . '/sync_log.json';
        $logs = [];
        if (file_exists($logFile)) {
            $raw = readFileLocked($logFile);
            $decoded = $raw !== false ? json_decode($raw, true) : null;
            if (is_array($decoded)) $logs = $decoded;
        }
        echo json_encode(['logs' => $logs], JSON_UNESCAPED_SLASHES);
        exit;
    }

    $id = isset($_GET['id']) ? sanitizeId($_GET['id']) : '';

    if ($id !== '') {
        $filePath = $dataDir . '/' . $id . '.json';
        if (!file_exists($filePath)) {
            http_response_code(404);
            echo json_encode(['error' => 'Berkas laporan tidak ditemukan.']);
            exit;
        }
        $content = readFileLocked($filePath);
        if ($content === false) {
            http_response_code(500);
            echo json_encode(['error' => 'Gagal membaca berkas laporan.']);
            exit;
        }
        echo $content;
        exit;
    }

    // List all report files
    $files = glob($dataDir . '/*.json');
    $reports = [];

    foreach ($files as $file) {
        $fileId = basename($file, '.json');
        $mtime = filemtime($file);

        $decoded = json_decode(file_get_contents($file), true);
        $lokasi = $decoded['location']['lokasi'] ?? '';
        $name = $decoded['name'] ?? str_replace('_', ' ', $fileId);

        $uploadedPhotos = 0;
        if (!empty($decoded['photoSlots']) && is_array($decoded['photoSlots'])) {
            foreach ($decoded['photoSlots'] as $slot) {
                if (!empty($slot['isUploaded']) && (!empty($slot['imagePath']) || !empty($slot['imageDataUrl']))) {
                    $uploadedPhotos++;
                }
            }
        }

        $lockState = readNormalizedLockState($locksDir, $fileId);
        $activeDevicesSummary = formatActiveDevicesSummary($lockState);

        $reports[] = [
            'id' => $fileId,
            'name' => $name,
            'lokasi' => $lokasi,
            'photoCount' => $uploadedPhotos,
            'updatedAt' => date('Y-m-d H:i:s', $mtime),
            'fileSizeKb' => round(filesize($file) / 1024),
            'activeDeviceCount' => count($activeDevicesSummary),
            'activeDevices' => $activeDevicesSummary,
        ];
    }

    // Sort by updatedAt desc
    usort($reports, function ($a, $b) {
        return strcmp($b['updatedAt'], $a['updatedAt']);
    });

    echo json_encode($reports);
    exit;
}

if ($method === 'POST') {
    $baseDataDir = __DIR__ . '/../data';
    if (($_GET['action'] ?? '') === 'sync_upload') {
        verifySyncAccess($baseDataDir, 'sync_upload');
        $type = (string)($_GET['type'] ?? '');
        $reportId = sanitizeId((string)($_GET['reportId'] ?? ''));
        if ($reportId === '') {
            http_response_code(400);
            echo json_encode(['error' => 'reportId tidak valid.']);
            exit;
        }

        $rawBody = file_get_contents('php://input');
        if ($rawBody === false || $rawBody === '') {
            http_response_code(400);
            echo json_encode(['error' => 'Body upload kosong.']);
            exit;
        }

        if ($type === 'json') {
            $decoded = json_decode($rawBody, true);
            if (!is_array($decoded)) {
                http_response_code(400);
                echo json_encode(['error' => 'Format JSON tidak valid.']);
                exit;
            }
            $targetJson = $dataDir . '/' . $reportId . '.json';
            if (!writeFileAtomic($targetJson, $rawBody)) {
                http_response_code(500);
                echo json_encode(['error' => 'Gagal menulis JSON ke disk server.']);
                exit;
            }
            appendSyncLog($baseDataDir, 'sync_upload', 'ok', "JSON {$reportId} (" . strlen($rawBody) . " B)");
            echo json_encode([
                'success' => true,
                'type' => 'json',
                'reportId' => $reportId,
                'sizeBytes' => strlen($rawBody),
                'md5' => md5($rawBody),
            ], JSON_UNESCAPED_SLASHES);
            exit;
        }

        if ($type === 'image') {
            $fileName = basename((string)($_GET['file'] ?? ''));
            if (!preg_match('/^[a-zA-Z0-9_.-]+\.(jpe?g|png|webp)$/i', $fileName)) {
                http_response_code(400);
                echo json_encode(['error' => 'Nama berkas gambar tidak valid.']);
                exit;
            }
            $len = strlen($rawBody);
            $isJpeg = $len >= 32 && substr($rawBody, 0, 3) === "\xFF\xD8\xFF";
            $isPng = $len >= 32 && substr($rawBody, 0, 8) === "\x89PNG\r\n\x1A\n";
            $isWebp = $len >= 32 && substr($rawBody, 0, 4) === 'RIFF' && substr($rawBody, 8, 4) === 'WEBP';
            if (!$isJpeg && !$isPng && !$isWebp) {
                http_response_code(400);
                echo json_encode(['error' => 'Payload bukan gambar JPEG/PNG/WebP yang valid.']);
                exit;
            }
            $targetImg = $dataDir . '/' . $reportId . '/' . $fileName;
            if (!writeFileAtomic($targetImg, $rawBody)) {
                http_response_code(500);
                echo json_encode(['error' => 'Gagal menulis gambar ke disk server.']);
                exit;
            }
            echo json_encode([
                'success' => true,
                'type' => 'image',
                'reportId' => $reportId,
                'fileName' => $fileName,
                'sizeBytes' => $len,
                'md5' => md5($rawBody),
            ], JSON_UNESCAPED_SLASHES);
            exit;
        }

        http_response_code(400);
        echo json_encode(['error' => 'Parameter type harus json atau image.']);
        exit;
    }

    $input = file_get_contents('php://input');
    if (!$input) {
        http_response_code(400);
        echo json_encode(['error' => 'Data kosong.']);
        exit;
    }

    $payload = json_decode($input, true);
    if (!is_array($payload)) {
        http_response_code(400);
        echo json_encode(['error' => 'Format JSON tidak valid.']);
        exit;
    }

    $action = $_GET['action'] ?? ($payload['action'] ?? 'save');

    // 0. Device lease lock management
    if ($action === 'acquire_lock') {
        $reportId = sanitizeId($payload['reportId'] ?? '');
        $deviceId = trim((string)($payload['deviceId'] ?? ''));
        $deviceName = trim((string)($payload['deviceName'] ?? 'Perangkat Lain'));
        if ($reportId === '' || $deviceId === '') {
            http_response_code(400);
            echo json_encode(['error' => 'reportId dan deviceId wajib diisi.']);
            exit;
        }
        $now = time();
        $resolvedName = $deviceName !== '' ? $deviceName : 'Perangkat';
        $ipAddr = $_SERVER['REMOTE_ADDR'] ?? '';
        $state = readNormalizedLockState($locksDir, $reportId) ?? [
            'deviceId' => '',
            'deviceName' => '',
            'ip' => '',
            'acquiredAt' => 0,
            'expiresAt' => 0,
            'activeDevices' => [],
        ];

        $hasOtherEditor = ($state['deviceId'] !== '' && $state['deviceId'] !== $deviceId);

        if (!$hasOtherEditor) {
            $state['deviceId'] = $deviceId;
            $state['deviceName'] = $resolvedName;
            $state['ip'] = $ipAddr;
            $state['acquiredAt'] = $state['acquiredAt'] > 0 ? $state['acquiredAt'] : $now;
            $state['expiresAt'] = $now + LOCK_TTL_SECONDS;
            $state['activeDevices'][$deviceId] = [
                'deviceId' => $deviceId,
                'deviceName' => $resolvedName,
                'ip' => $ipAddr,
                'role' => 'editor',
                'lastSeenAt' => $now,
                'expiresAt' => $now + LOCK_TTL_SECONDS,
            ];
            writeFileAtomic($locksDir . '/' . $reportId . '.json', json_encode($state, JSON_PRETTY_PRINT));
            echo json_encode([
                'acquired' => true,
                'lock' => [
                    'deviceId' => $state['deviceId'],
                    'deviceName' => $state['deviceName'],
                    'ip' => $state['ip'],
                    'acquiredAt' => $state['acquiredAt'],
                    'expiresAt' => $state['expiresAt'],
                ],
                'activeDeviceCount' => count($state['activeDevices']),
            ]);
            exit;
        }

        $state['activeDevices'][$deviceId] = [
            'deviceId' => $deviceId,
            'deviceName' => $resolvedName,
            'ip' => $ipAddr,
            'role' => 'viewer',
            'lastSeenAt' => $now,
            'expiresAt' => $now + LOCK_TTL_SECONDS,
        ];
        writeFileAtomic($locksDir . '/' . $reportId . '.json', json_encode($state, JSON_PRETTY_PRINT));
        echo json_encode([
            'acquired' => false,
            'lock' => [
                'deviceId' => $state['deviceId'],
                'deviceName' => $state['deviceName'],
                'ip' => $state['ip'],
                'acquiredAt' => $state['acquiredAt'],
                'expiresAt' => $state['expiresAt'],
            ],
            'activeDeviceCount' => count($state['activeDevices']),
        ]);
        exit;
    }

    if ($action === 'release_lock') {
        $reportId = sanitizeId($payload['reportId'] ?? '');
        $deviceId = trim((string)($payload['deviceId'] ?? ''));
        if ($reportId !== '' && $deviceId !== '') {
            $state = readNormalizedLockState($locksDir, $reportId);
            if ($state !== null) {
                unset($state['activeDevices'][$deviceId]);
                if ($state['deviceId'] === $deviceId) {
                    $state['deviceId'] = '';
                    $state['deviceName'] = '';
                    $state['ip'] = '';
                    $state['acquiredAt'] = 0;
                    $state['expiresAt'] = 0;
                }
                if ($state['deviceId'] === '' && empty($state['activeDevices'])) {
                    @unlink($locksDir . '/' . $reportId . '.json');
                } else {
                    writeFileAtomic($locksDir . '/' . $reportId . '.json', json_encode($state, JSON_PRETTY_PRINT));
                }
            }
        }
        echo json_encode(['released' => true]);
        exit;
    }

    // 1. Upload discrete image file
    if ($action === 'upload_image') {
        $reportId = sanitizeId($payload['reportId'] ?? ($_GET['reportId'] ?? ''));
        $slotId = sanitizeId($payload['slotId'] ?? ($_GET['slotId'] ?? ''));
        $imageData = $payload['imageData'] ?? null;

        if ($reportId === '' || $slotId === '' || !is_string($imageData)) {
            http_response_code(400);
            echo json_encode(['error' => 'reportId, slotId, dan imageData wajib diisi.']);
            exit;
        }

        if (strpos($imageData, 'data:image/') !== 0 || strpos($imageData, ',') === false) {
            http_response_code(400);
            echo json_encode(['error' => 'Data gambar harus berupa format data:image base64.']);
            exit;
        }

        $parts = explode(',', $imageData, 2);
        $binary = base64_decode($parts[1], true);

        if ($binary === false || strlen($binary) < 50) {
            http_response_code(400);
            echo json_encode(['error' => 'Data gambar tidak valid atau rusak.']);
            exit;
        }

        $reportDir = $dataDir . '/' . $reportId;
        if (!is_dir($reportDir)) {
            mkdir($reportDir, 0777, true);
        }

        $fileName = $slotId . '.jpg';
        $targetPath = $reportDir . '/' . $fileName;
        $written = file_put_contents($targetPath, $binary, LOCK_EX);

        if ($written === false) {
            http_response_code(500);
            echo json_encode(['error' => 'Gagal menulis berkas gambar di server.']);
            exit;
        }

        $relativePath = 'data/reports/' . $reportId . '/' . $fileName;
        echo json_encode([
            'success' => true,
            'imagePath' => $relativePath,
            'bytes' => $written,
        ]);
        exit;
    }

    // 2. Delete discrete image file
    if ($action === 'delete_image') {
        $reportId = sanitizeId($payload['reportId'] ?? ($_GET['reportId'] ?? ''));
        $slotId = sanitizeId($payload['slotId'] ?? ($_GET['slotId'] ?? ''));

        if ($reportId !== '' && $slotId !== '') {
            $targetPath = $dataDir . '/' . $reportId . '/' . $slotId . '.jpg';
            if (file_exists($targetPath)) {
                @unlink($targetPath);
            }
        }
        echo json_encode(['success' => true]);
        exit;
    }

    // 3. Migrate legacy base64 report to discrete files
    if ($action === 'migrate_images') {
        $reportId = sanitizeId($payload['id'] ?? ($_GET['id'] ?? ''));
        if ($reportId === '') {
            http_response_code(400);
            echo json_encode(['error' => 'ID laporan tidak valid.']);
            exit;
        }

        $targetFile = $dataDir . '/' . $reportId . '.json';
        if (!file_exists($targetFile)) {
            http_response_code(404);
            echo json_encode(['error' => 'Berkas laporan tidak ditemukan.']);
            exit;
        }

        $rawReport = readFileLocked($targetFile);
        $reportData = $rawReport === false ? null : json_decode($rawReport, true);
        if (!is_array($reportData) || empty($reportData['photoSlots'])) {
            echo json_encode(['success' => true, 'convertedCount' => 0]);
            exit;
        }

        $reportDir = $dataDir . '/' . $reportId;
        if (!is_dir($reportDir)) {
            mkdir($reportDir, 0777, true);
        }

        $convertedCount = 0;
        foreach ($reportData['photoSlots'] as $slotId => &$slot) {
            if (!empty($slot['imageDataUrl']) && strpos($slot['imageDataUrl'], 'data:image') === 0) {
                $parts = explode(',', $slot['imageDataUrl']);
                $binary = base64_decode($parts[1]);
                if ($binary !== false && strlen($binary) > 0) {
                    $cleanSlotId = sanitizeId($slotId);
                    $fileName = $cleanSlotId . '.jpg';
                    $filePath = $reportDir . '/' . $fileName;
                    file_put_contents($filePath, $binary, LOCK_EX);

                    $slot['imagePath'] = 'data/reports/' . $reportId . '/' . $fileName;
                    unset($slot['imageDataUrl'], $slot['rawImageDataUrl']);
                    $convertedCount++;
                }
            }
        }
        unset($slot);

        $newEncoded = json_encode($reportData, JSON_PRETTY_PRINT);
        writeFileAtomic($targetFile, $newEncoded);

        echo json_encode([
            'success' => true,
            'id' => $reportId,
            'convertedCount' => $convertedCount,
            'newSizeBytes' => strlen($newEncoded),
        ]);
        exit;
    }

    // 4. Create new report
    if ($action === 'create') {
        $name = trim($payload['name'] ?? 'REPORT_MT PLTS JKT_BARU');
        $id = sanitizeId($payload['id'] ?? $name);
        if ($id === '') {
            $id = 'REPORT_MT_PLTS_JKT_' . time();
        }

        $targetFile = $dataDir . '/' . $id . '.json';
        if (file_exists($targetFile)) {
            echo json_encode(['success' => true, 'id' => $id, 'name' => $name, 'existed' => true]);
            exit;
        }

        $stateToSave = $payload['state'] ?? null;
        if (!$stateToSave) {
            $templateFile = $dataDir . '/REPORT_MT_PLTS_JKT_SMPN_72.json';
            if (file_exists($templateFile)) {
                $stateToSave = json_decode(file_get_contents($templateFile), true);
                if (isset($stateToSave['location'])) {
                    $stateToSave['location']['lokasi'] = $payload['lokasi'] ?? '';
                    $stateToSave['location']['alamat'] = '';
                }
                if (!empty($stateToSave['realizationDates']) && is_array($stateToSave['realizationDates'])) {
                    foreach ($stateToSave['realizationDates'] as &$rd) {
                        $rd['tanggalPelaksanaan'] = '';
                        $rd['kondisiCuaca'] = '';
                    }
                    unset($rd);
                }
                if (!empty($stateToSave['photoSlots']) && is_array($stateToSave['photoSlots'])) {
                    foreach ($stateToSave['photoSlots'] as &$slot) {
                        unset($slot['imageDataUrl'], $slot['rawImageDataUrl'], $slot['imagePath'], $slot['panX'], $slot['panY'], $slot['isFitted']);
                        $slot['isUploaded'] = false;
                    }
                }
            }
        } elseif (is_array($stateToSave)) {
            if (!empty($stateToSave['realizationDates']) && is_array($stateToSave['realizationDates'])) {
                foreach ($stateToSave['realizationDates'] as &$rd) {
                    $rd['tanggalPelaksanaan'] = '';
                    $rd['kondisiCuaca'] = '';
                }
                unset($rd);
            }
        }

        $stateToSave['id'] = $id;
        $stateToSave['name'] = $name;

        writeFileAtomic($targetFile, json_encode($stateToSave, JSON_PRETTY_PRINT));
        echo json_encode(['success' => true, 'id' => $id, 'name' => $name]);
        exit;
    }

    // 4b. Swap phase image files on disk and persist updated state atomically
    if ($action === 'swap_phases') {
        $id = sanitizeId($payload['id'] ?? ($payload['reportId'] ?? ''));
        if ($id === '') {
            http_response_code(400);
            echo json_encode(['error' => 'ID laporan tidak valid.']);
            exit;
        }
        $deviceId = trim((string)($payload['deviceId'] ?? ''));
        $otherLock = isLockedByOtherDevice($locksDir, $id, $deviceId);
        if ($otherLock !== null) {
            http_response_code(423);
            echo json_encode([
                'error' => 'Berkas sedang dipakai oleh ' . ($otherLock['deviceName'] ?? 'perangkat lain') . '.',
                'locked' => true,
                'lock' => $otherLock,
            ]);
            exit;
        }

        $targetFile = $dataDir . '/' . $id . '.json';
        if (!file_exists($targetFile)) {
            http_response_code(404);
            echo json_encode(['error' => 'Berkas laporan tidak ditemukan.']);
            exit;
        }

        $existingRaw = readFileLocked($targetFile);
        $existingJson = $existingRaw !== false ? json_decode($existingRaw, true) : null;

        $state = $payload['state'] ?? null;
        if (!is_array($state)) {
            http_response_code(400);
            echo json_encode(['error' => 'State laporan tidak valid.']);
            exit;
        }
        $state['id'] = $id;
        if (empty($state['name'])) {
            $state['name'] = is_array($existingJson) && !empty($existingJson['name'])
                ? $existingJson['name']
                : str_replace('_', ' ', $id);
        }

        $encoded = json_encode($state, JSON_PRETTY_PRINT);
        if ($encoded === false) {
            http_response_code(500);
            echo json_encode(['error' => 'Gagal mengodekan JSON: ' . json_last_error_msg()]);
            exit;
        }

        $pairs = is_array($payload['pairs'] ?? null) ? $payload['pairs'] : [];
        $reportDir = $dataDir . '/' . $id;
        $swappedFiles = 0;

        $swapDiskPair = static function (string $dir, string $fileAName, string $fileBName): bool {
            $fileA = $dir . '/' . $fileAName;
            $fileB = $dir . '/' . $fileBName;
            $hasA = is_file($fileA);
            $hasB = is_file($fileB);
            if (!$hasA && !$hasB) return false;
            if ($hasA && $hasB) {
                $tmp = $dir . '/.swap_' . uniqid('', true) . '_' . $fileAName;
                if (!@rename($fileA, $tmp)) return false;
                if (!@rename($fileB, $fileA)) {
                    @rename($tmp, $fileA);
                    return false;
                }
                if (!@rename($tmp, $fileB)) {
                    @rename($fileA, $fileB);
                    @rename($tmp, $fileA);
                    return false;
                }
                return true;
            }
            return $hasA ? @rename($fileA, $fileB) : @rename($fileB, $fileA);
        };

        if (is_dir($reportDir) && !empty($pairs)) {
            foreach ($pairs as $pair) {
                if (!is_array($pair)) continue;
                $slotA = sanitizeId((string)($pair['a'] ?? ''));
                $slotB = sanitizeId((string)($pair['b'] ?? ''));
                if ($slotA === '' || $slotB === '' || $slotA === $slotB) continue;
                if ($swapDiskPair($reportDir, $slotA . '.jpg', $slotB . '.jpg')) {
                    $swappedFiles++;
                }
                $swapDiskPair($reportDir, $slotA . '_raw.jpg', $slotB . '_raw.jpg');
            }
        }

        if (!writeFileAtomic($targetFile, $encoded)) {
            http_response_code(500);
            echo json_encode(['error' => 'Gagal menulis ke berkas pada server.']);
            exit;
        }

        echo json_encode([
            'success' => true,
            'id' => $id,
            'swappedFiles' => $swappedFiles,
            'updatedAt' => date('Y-m-d H:i:s'),
        ]);
        exit;
    }

    // 5. Default: Save state JSON
    $id = sanitizeId($payload['id'] ?? 'REPORT_MT_PLTS_JKT_SMPN_72');
    $deviceId = trim((string)($payload['deviceId'] ?? ''));
    $otherLock = isLockedByOtherDevice($locksDir, $id, $deviceId);
    if ($otherLock !== null) {
        http_response_code(423);
        echo json_encode([
            'error' => 'Berkas sedang dipakai oleh ' . ($otherLock['deviceName'] ?? 'perangkat lain') . '.',
            'locked' => true,
            'lock' => $otherLock,
        ]);
        exit;
    }
    $targetFile = $dataDir . '/' . $id . '.json';

    $state = $payload['state'] ?? $payload;
    $state['id'] = $id;
    if (!empty($payload['name'])) {
        $state['name'] = $payload['name'];
    }

    $encoded = json_encode($state, JSON_PRETTY_PRINT);
    if ($encoded === false) {
        http_response_code(500);
        echo json_encode(['error' => 'Gagal mengodekan JSON: ' . json_last_error_msg()]);
        exit;
    }

    if (!writeFileAtomic($targetFile, $encoded)) {
        http_response_code(500);
        echo json_encode(['error' => 'Gagal menulis ke berkas pada server.']);
        exit;
    }

    echo json_encode([
        'success' => true,
        'id' => $id,
        'updatedAt' => date('Y-m-d H:i:s'),
        'bytes' => strlen($encoded),
    ]);
    exit;
}

http_response_code(405);
echo json_encode(['error' => 'Metode HTTP tidak didukung.']);
