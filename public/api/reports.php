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
header('Access-Control-Allow-Headers: Content-Type, Accept');
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

        $reports[] = [
            'id' => $fileId,
            'name' => $name,
            'lokasi' => $lokasi,
            'photoCount' => $uploadedPhotos,
            'updatedAt' => date('Y-m-d H:i:s', $mtime),
            'fileSizeKb' => round(filesize($file) / 1024),
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

    // 5. Default: Save state JSON
    $id = sanitizeId($payload['id'] ?? 'REPORT_MT_PLTS_JKT_SMPN_72');
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
