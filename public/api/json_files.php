<?php
// ---
// Summary:
// - Purpose: Unified HTTP REST API and CLI tool to inspect, query, and edit all JSON files under public/data/
// - Role: Backend API endpoint & terminal JSON manager
// - Depends on: PHP 8.0+, public/data/
// - Key Responsibilities: List JSON files, read full or dot-path values, atomically write/patch/create/delete JSON files via Web or Terminal
// ---

declare(strict_types=1);

$isCli = (php_sapi_name() === 'cli');

if (!$isCli) {
    header('Content-Type: application/json; charset=utf-8');
    header('Access-Control-Allow-Origin: *');
    header('Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type, Accept');
    header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
    header('Pragma: no-cache');
    header('Expires: 0');

    if (($_SERVER['REQUEST_METHOD'] ?? '') === 'OPTIONS') {
        http_response_code(200);
        exit;
    }
}

$dataRootRaw = __DIR__ . '/../data';
if (!is_dir($dataRootRaw)) {
    mkdir($dataRootRaw, 0777, true);
}
$dataRoot = realpath($dataRootRaw);
if ($dataRoot === false) {
    respondError('Direktori data tidak ditemukan.', 500, $isCli);
}

function respondJson($payload, int $status = 200, bool $isCli = false): void {
    if (!$isCli) {
        http_response_code($status);
    }
    echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) . PHP_EOL;
    exit($isCli && $status >= 400 ? 1 : 0);
}

function respondError(string $message, int $status = 400, bool $isCli = false): void {
    if ($isCli) {
        fwrite(STDERR, "Error: {$message}\n");
        exit(1);
    }
    respondJson(['error' => $message], $status, false);
}

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

function writeFileAtomic(string $filePath, string $contents): bool {
    $dir = dirname($filePath);
    if (!is_dir($dir)) {
        mkdir($dir, 0777, true);
    }
    $tmp = tempnam($dir, 'jf_');
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

function normalizeRelativeJsonPath(string $raw): string {
    $clean = str_replace('\\', '/', trim($raw));
    $clean = ltrim($clean, '/');
    if ($clean === '' || strpos($clean, '..') !== false || strpos($clean, "\0") !== false) {
        return '';
    }
    if (!preg_match('/^[a-zA-Z0-9_\/\-.]+$/', $clean)) {
        return '';
    }
    if (substr(strtolower($clean), -5) !== '.json') {
        $clean .= '.json';
    }
    return $clean;
}

function resolveExistingJsonFile(string $dataRoot, string $rawPath): ?array {
    $rel = normalizeRelativeJsonPath($rawPath);
    if ($rel === '') return null;
    $candidate = $dataRoot . DIRECTORY_SEPARATOR . str_replace('/', DIRECTORY_SEPARATOR, $rel);
    $real = realpath($candidate);
    if ($real === false || !is_file($real)) return null;
    $rootPrefix = rtrim($dataRoot, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;
    if (strpos($real, $rootPrefix) !== 0) return null;
    return ['rel' => $rel, 'abs' => $real];
}

function resolveTargetJsonFile(string $dataRoot, string $rawPath): ?array {
    $rel = normalizeRelativeJsonPath($rawPath);
    if ($rel === '') return null;
    $segments = explode('/', $rel);
    foreach ($segments as $seg) {
        if ($seg === '' || $seg === '.' || $seg === '..') return null;
    }
    $abs = $dataRoot . DIRECTORY_SEPARATOR . implode(DIRECTORY_SEPARATOR, $segments);
    return ['rel' => $rel, 'abs' => $abs];
}

function isFilledScalarValue($val): bool {
    if ($val === null) return false;
    if (is_bool($val)) return true;
    if (is_int($val) || is_float($val)) return true;
    if (is_string($val)) return trim($val) !== '';
    return false;
}

function countGenericJsonLeaves($node, int &$filled, int &$total): void {
    if (is_array($node)) {
        if (count($node) === 0) return;
        foreach ($node as $child) {
            countGenericJsonLeaves($child, $filled, $total);
        }
        return;
    }
    $total++;
    if (isFilledScalarValue($node)) {
        $filled++;
    }
}

function computeJsonProgress($decoded): array {
    $dataFilled = 0;
    $dataTotal = 0;
    $imagesFilled = 0;
    $imagesTotal = 0;
    $isReport = is_array($decoded) && isset($decoded['photoSlots']) && is_array($decoded['photoSlots']);

    if ($isReport) {
        $hiddenPhases = [];
        if (isset($decoded['hiddenPhases']) && is_array($decoded['hiddenPhases'])) {
            foreach ($decoded['hiddenPhases'] as $hp) {
                if (is_string($hp)) $hiddenPhases[$hp] = true;
            }
        }

        foreach ($decoded['photoSlots'] as $slot) {
            if (!is_array($slot)) continue;
            $pk = isset($slot['phaseKey']) && is_string($slot['phaseKey']) ? $slot['phaseKey'] : '';
            if ($pk !== '' && isset($hiddenPhases[$pk])) continue;
            $imagesTotal++;
            $hasImg = !empty($slot['isUploaded'])
                || (!empty($slot['imagePath']) && is_string($slot['imagePath']) && trim($slot['imagePath']) !== '')
                || (!empty($slot['imageDataUrl']) && is_string($slot['imageDataUrl']) && trim($slot['imageDataUrl']) !== '');
            if ($hasImg) {
                $imagesFilled++;
            }
        }

        if (isset($decoded['location']) && is_array($decoded['location'])) {
            foreach ($decoded['location'] as $val) {
                $dataTotal++;
                if (isFilledScalarValue($val)) $dataFilled++;
            }
        }

        if (isset($decoded['realizationDates']) && is_array($decoded['realizationDates'])) {
            foreach ($decoded['realizationDates'] as $row) {
                if (!is_array($row)) continue;
                $rPhase = isset($row['phase']) && is_string($row['phase']) ? $row['phase'] : '';
                if ($rPhase === 'pra' && isset($hiddenPhases['physical']) && isset($hiddenPhases['pre_measure'])) continue;
                if ($rPhase === 'pembersihan' && isset($hiddenPhases['cleaning'])) continue;
                if ($rPhase === 'pasca' && isset($hiddenPhases['post_measure'])) continue;
                foreach (['tanggalPelaksanaan', 'kondisiCuaca'] as $field) {
                    $dataTotal++;
                    if (isset($row[$field]) && isFilledScalarValue($row[$field])) $dataFilled++;
                }
            }
        }

        if (!isset($hiddenPhases['physical']) && isset($decoded['checklist']) && is_array($decoded['checklist'])) {
            $hasDottedNo = false;
            foreach ($decoded['checklist'] as $row) {
                if (is_array($row) && isset($row['no']) && strpos((string)$row['no'], '.') !== false) {
                    $hasDottedNo = true;
                    break;
                }
            }
            foreach ($decoded['checklist'] as $row) {
                if (!is_array($row)) continue;
                if ($hasDottedNo && strpos((string)($row['no'] ?? ''), '.') === false) {
                    continue;
                }
                $dataTotal++;
                if (isset($row['deskripsi']) && isFilledScalarValue($row['deskripsi'])) {
                    $dataFilled++;
                }
            }
        }

        if (isset($decoded['measurements']) && is_array($decoded['measurements'])) {
            $mFields = [];
            if (!isset($hiddenPhases['pre_measure'])) $mFields[] = 'hasilBefore';
            if (!isset($hiddenPhases['post_measure'])) $mFields[] = 'hasilAfter';
            foreach ($decoded['measurements'] as $row) {
                if (!is_array($row)) continue;
                foreach ($mFields as $field) {
                    $dataTotal++;
                    if (isset($row[$field]) && isFilledScalarValue($row[$field])) $dataFilled++;
                }
            }
        }

        if (isset($decoded['datasheet']) && is_array($decoded['datasheet'])) {
            foreach ($decoded['datasheet'] as $val) {
                $dataTotal++;
                if (isFilledScalarValue($val)) $dataFilled++;
            }
        }

        if (isset($decoded['conclusions']) && is_array($decoded['conclusions'])) {
            foreach ($decoded['conclusions'] as $val) {
                $dataTotal++;
                if (isFilledScalarValue($val)) $dataFilled++;
            }
        }

        if (isset($decoded['damages']) && is_array($decoded['damages'])) {
            foreach ($decoded['damages'] as $row) {
                if (!is_array($row)) continue;
                foreach (['lokasi', 'kerusakanDiLokasi', 'perbaikanYangDilakukan', 'updateKerusakan'] as $field) {
                    $dataTotal++;
                    if (isset($row[$field]) && isFilledScalarValue($row[$field])) $dataFilled++;
                }
            }
        }

        if (isset($decoded['recommendations']) && is_array($decoded['recommendations'])) {
            foreach ($decoded['recommendations'] as $row) {
                if (!is_array($row)) continue;
                foreach (['lokasi', 'kerusakanDiLokasi', 'updateKerusakan', 'rekomendasi'] as $field) {
                    $dataTotal++;
                    if (isset($row[$field]) && isFilledScalarValue($row[$field])) $dataFilled++;
                }
            }
        }
    } elseif ($decoded !== null) {
        countGenericJsonLeaves($decoded, $dataFilled, $dataTotal);
    }

    $dataPercent = $dataTotal > 0 ? (int)round(($dataFilled / $dataTotal) * 100) : 0;
    $imagesPercent = $imagesTotal > 0 ? (int)round(($imagesFilled / $imagesTotal) * 100) : 0;
    $combinedTotal = $dataTotal + $imagesTotal;
    $combinedFilled = $dataFilled + $imagesFilled;
    $overallPercent = $combinedTotal > 0 ? (int)round(($combinedFilled / $combinedTotal) * 100) : 0;

    return [
        'isReport' => $isReport,
        'dataFilled' => $dataFilled,
        'dataTotal' => $dataTotal,
        'dataPercent' => $dataPercent,
        'imagesFilled' => $imagesFilled,
        'imagesTotal' => $imagesTotal,
        'imagesPercent' => $imagesPercent,
        'overallPercent' => $overallPercent,
    ];
}

function listAllJsonFiles(string $dataRoot): array {
    $items = [];
    $iterator = new RecursiveIteratorIterator(
        new RecursiveDirectoryIterator($dataRoot, FilesystemIterator::SKIP_DOTS)
    );
    $rootPrefix = rtrim($dataRoot, DIRECTORY_SEPARATOR) . DIRECTORY_SEPARATOR;

    foreach ($iterator as $fileInfo) {
        if (!$fileInfo->isFile()) continue;
        if (strtolower($fileInfo->getExtension()) !== 'json') continue;

        $abs = $fileInfo->getPathname();
        $rel = str_replace('\\', '/', substr($abs, strlen($rootPrefix)));
        $parts = explode('/', $rel);
        $folder = count($parts) > 1 ? $parts[0] : 'root';
        $mtime = $fileInfo->getMTime();
        $size = $fileInfo->getSize();

        $lokasi = '';
        $name = basename($rel, '.json');
        $decoded = null;
        $raw = readFileLocked($abs);
        if ($raw !== false) {
            $parsed = json_decode($raw, true);
            if (is_array($parsed)) {
                $decoded = $parsed;
                if (!empty($decoded['location']['lokasi']) && is_string($decoded['location']['lokasi'])) {
                    $lokasi = $decoded['location']['lokasi'];
                } elseif (!empty($decoded['deviceName']) && is_string($decoded['deviceName'])) {
                    $lokasi = 'Lock: ' . $decoded['deviceName'];
                }
                if (!empty($decoded['name']) && is_string($decoded['name'])) {
                    $name = $decoded['name'];
                }
            }
        }

        $items[] = [
            'file' => $rel,
            'folder' => $folder,
            'name' => $name,
            'lokasi' => $lokasi,
            'sizeBytes' => $size,
            'updatedAt' => date('Y-m-d H:i:s', $mtime),
            'updatedTs' => $mtime,
            'progress' => computeJsonProgress($decoded),
        ];
    }

    usort($items, function ($a, $b) {
        if ($a['folder'] !== $b['folder']) {
            return strcmp($a['folder'], $b['folder']);
        }
        return $b['updatedTs'] <=> $a['updatedTs'];
    });

    return $items;
}

function splitDotPath(string $dotPath): array {
    $trimmed = trim($dotPath);
    if ($trimmed === '') return [];
    return array_values(array_filter(explode('.', $trimmed), static fn($s) => $s !== ''));
}

function getByDotPath($data, string $dotPath) {
    $segments = splitDotPath($dotPath);
    $cur = $data;
    foreach ($segments as $seg) {
        if (is_array($cur)) {
            $key = ctype_digit($seg) && array_key_exists((int)$seg, $cur) ? (int)$seg : $seg;
            if (array_key_exists($key, $cur)) {
                $cur = $cur[$key];
                continue;
            }
        }
        return ['found' => false, 'value' => null];
    }
    return ['found' => true, 'value' => $cur];
}

function setByDotPath(&$data, string $dotPath, $value): bool {
    $segments = splitDotPath($dotPath);
    if (count($segments) === 0) return false;
    if (!is_array($data)) $data = [];
    $cur = &$data;
    $lastIdx = count($segments) - 1;
    foreach ($segments as $i => $seg) {
        $key = ctype_digit($seg) ? (int)$seg : $seg;
        if ($i === $lastIdx) {
            $cur[$key] = $value;
            return true;
        }
        if (!isset($cur[$key]) || !is_array($cur[$key])) {
            $cur[$key] = [];
        }
        $cur = &$cur[$key];
    }
    return false;
}

function deleteByDotPath(&$data, string $dotPath): bool {
    $segments = splitDotPath($dotPath);
    if (count($segments) === 0 || !is_array($data)) return false;
    $cur = &$data;
    $lastIdx = count($segments) - 1;
    foreach ($segments as $i => $seg) {
        $key = ctype_digit($seg) && array_key_exists((int)$seg, $cur) ? (int)$seg : $seg;
        if (!is_array($cur) || !array_key_exists($key, $cur)) {
            return false;
        }
        if ($i === $lastIdx) {
            $isList = array_is_list($cur);
            unset($cur[$key]);
            if ($isList && is_int($key)) {
                $cur = array_values($cur);
            }
            return true;
        }
        $cur = &$cur[$key];
    }
    return false;
}

function parseFlexibleCliValue(string $raw) {
    $trimmed = trim($raw);
    if ($trimmed === 'true') return true;
    if ($trimmed === 'false') return false;
    if ($trimmed === 'null') return null;
    if (is_numeric($trimmed) && !preg_match('/^0\d+/', $trimmed)) {
        return strpos($trimmed, '.') !== false ? (float)$trimmed : (int)$trimmed;
    }
    if (
        ($trimmed !== '' && ($trimmed[0] === '{' || $trimmed[0] === '[' || $trimmed[0] === '"'))
    ) {
        $decoded = json_decode($trimmed, true);
        if (json_last_error() === JSON_ERROR_NONE) {
            return $decoded;
        }
    }
    return $raw;
}

function encodeFormattedJson($data): ?string {
    $encoded = json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    return $encoded === false ? null : ($encoded . "\n");
}

// =========================================================================
// CLI MODE
// =========================================================================
if ($isCli) {
    global $argv;
    $args = array_slice($argv ?? [], 1);
    $cmd = $args[0] ?? 'help';

    if ($cmd === 'help' || $cmd === '--help' || $cmd === '-h') {
        echo "Penggunaan CLI json_files.php:\n";
        echo "  php public/api/json_files.php list\n";
        echo "  php public/api/json_files.php get <file> [--raw] [--path=<dot.path>]\n";
        echo "  php public/api/json_files.php set <file> <dot.path> <value>\n";
        echo "  php public/api/json_files.php unset <file> <dot.path>\n";
        echo "  php public/api/json_files.php write <file> <json_or_@filepath_or_->\n";
        echo "  php public/api/json_files.php create <file> [json_or_@filepath]\n";
        echo "  php public/api/json_files.php delete <file>\n";
        exit(0);
    }

    if ($cmd === 'list') {
        $files = listAllJsonFiles($dataRoot);
        respondJson(['total' => count($files), 'files' => $files], 200, true);
    }

    if ($cmd === 'get') {
        $fileArg = $args[1] ?? '';
        if ($fileArg === '') respondError('Parameter <file> wajib diisi.', 400, true);
        $resolved = resolveExistingJsonFile($dataRoot, $fileArg);
        if ($resolved === null) respondError("Berkas tidak ditemukan: {$fileArg}", 404, true);

        $raw = readFileLocked($resolved['abs']);
        if ($raw === false) respondError('Gagal membaca berkas.', 500, true);

        $isRaw = in_array('--raw', $args, true);
        $dotPath = '';
        foreach ($args as $a) {
            if (strpos($a, '--path=') === 0) {
                $dotPath = substr($a, 7);
            }
        }

        if ($dotPath !== '') {
            $decoded = json_decode($raw, true);
            $res = getByDotPath($decoded, $dotPath);
            if (!$res['found']) respondError("Path tidak ditemukan: {$dotPath}", 404, true);
            if ($isRaw) {
                echo (is_string($res['value']) ? $res['value'] : json_encode($res['value'], JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES)) . PHP_EOL;
                exit(0);
            }
            respondJson(['file' => $resolved['rel'], 'path' => $dotPath, 'value' => $res['value']], 200, true);
        }

        if ($isRaw) {
            echo $raw . (substr($raw, -1) === "\n" ? '' : "\n");
            exit(0);
        }
        $decoded = json_decode($raw, true);
        respondJson([
            'file' => $resolved['rel'],
            'sizeBytes' => filesize($resolved['abs']),
            'updatedAt' => date('Y-m-d H:i:s', filemtime($resolved['abs'])),
            'data' => $decoded,
        ], 200, true);
    }

    if ($cmd === 'set') {
        $fileArg = $args[1] ?? '';
        $dotPath = $args[2] ?? '';
        if ($fileArg === '' || $dotPath === '' || !array_key_exists(3, $args)) {
            respondError('Format: set <file> <dot.path> <value>', 400, true);
        }
        $resolved = resolveExistingJsonFile($dataRoot, $fileArg);
        if ($resolved === null) respondError("Berkas tidak ditemukan: {$fileArg}", 404, true);

        $raw = readFileLocked($resolved['abs']);
        $decoded = json_decode($raw ?: '{}', true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            respondError('JSON eksisting tidak valid: ' . json_last_error_msg(), 500, true);
        }

        $val = parseFlexibleCliValue($args[3]);
        if (!setByDotPath($decoded, $dotPath, $val)) {
            respondError("Gagal memperbarui path: {$dotPath}", 400, true);
        }
        $encoded = encodeFormattedJson($decoded);
        if ($encoded === null || !writeFileAtomic($resolved['abs'], $encoded)) {
            respondError('Gagal menulis berkas.', 500, true);
        }
        respondJson([
            'success' => true,
            'file' => $resolved['rel'],
            'path' => $dotPath,
            'value' => $val,
        ], 200, true);
    }

    if ($cmd === 'unset') {
        $fileArg = $args[1] ?? '';
        $dotPath = $args[2] ?? '';
        if ($fileArg === '' || $dotPath === '') {
            respondError('Format: unset <file> <dot.path>', 400, true);
        }
        $resolved = resolveExistingJsonFile($dataRoot, $fileArg);
        if ($resolved === null) respondError("Berkas tidak ditemukan: {$fileArg}", 404, true);

        $raw = readFileLocked($resolved['abs']);
        $decoded = json_decode($raw ?: '{}', true);
        if (!deleteByDotPath($decoded, $dotPath)) {
            respondError("Path tidak ditemukan: {$dotPath}", 404, true);
        }
        $encoded = encodeFormattedJson($decoded);
        if ($encoded === null || !writeFileAtomic($resolved['abs'], $encoded)) {
            respondError('Gagal menulis berkas.', 500, true);
        }
        respondJson(['success' => true, 'file' => $resolved['rel'], 'deletedPath' => $dotPath], 200, true);
    }

    if ($cmd === 'write' || $cmd === 'create') {
        $fileArg = $args[1] ?? '';
        $inputArg = $args[2] ?? ($cmd === 'create' ? '{}' : '');
        if ($fileArg === '' || $inputArg === '') {
            respondError("Format: {$cmd} <file> <json_or_@filepath_or_->", 400, true);
        }
        $target = resolveTargetJsonFile($dataRoot, $fileArg);
        if ($target === null) respondError("Path berkas tidak valid: {$fileArg}", 400, true);
        if ($cmd === 'create' && file_exists($target['abs'])) {
            respondError("Berkas sudah ada: {$target['rel']}", 409, true);
        }

        if ($inputArg === '-') {
            $jsonInput = stream_get_contents(STDIN);
        } elseif ($inputArg[0] === '@') {
            $srcPath = substr($inputArg, 1);
            if (!is_file($srcPath)) respondError("Berkas sumber tidak ditemukan: {$srcPath}", 404, true);
            $jsonInput = file_get_contents($srcPath);
        } else {
            $jsonInput = $inputArg;
        }

        $decoded = json_decode((string)$jsonInput, true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            respondError('JSON tidak valid: ' . json_last_error_msg(), 400, true);
        }
        $encoded = encodeFormattedJson($decoded);
        if ($encoded === null || !writeFileAtomic($target['abs'], $encoded)) {
            respondError('Gagal menulis berkas.', 500, true);
        }
        respondJson([
            'success' => true,
            'file' => $target['rel'],
            'sizeBytes' => strlen($encoded),
        ], 200, true);
    }

    if ($cmd === 'delete') {
        $fileArg = $args[1] ?? '';
        if ($fileArg === '') respondError('Format: delete <file>', 400, true);
        $resolved = resolveExistingJsonFile($dataRoot, $fileArg);
        if ($resolved === null) respondError("Berkas tidak ditemukan: {$fileArg}", 404, true);
        if (!@unlink($resolved['abs'])) respondError('Gagal menghapus berkas.', 500, true);
        respondJson(['success' => true, 'deleted' => $resolved['rel']], 200, true);
    }

    respondError("Perintah tidak dikenal: {$cmd}. Jalankan --help untuk panduan.", 400, true);
}

// =========================================================================
// HTTP MODE
// =========================================================================
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method === 'GET') {
    $fileParam = isset($_GET['file']) ? (string)$_GET['file'] : '';
    if ($fileParam === '') {
        $files = listAllJsonFiles($dataRoot);
        respondJson(['total' => count($files), 'files' => $files]);
    }

    $resolved = resolveExistingJsonFile($dataRoot, $fileParam);
    if ($resolved === null) {
        respondError('Berkas JSON tidak ditemukan.', 404);
    }

    $raw = readFileLocked($resolved['abs']);
    if ($raw === false) {
        respondError('Gagal membaca berkas JSON.', 500);
    }

    $dotPath = isset($_GET['path']) ? (string)$_GET['path'] : '';
    if ($dotPath !== '') {
        $decoded = json_decode($raw, true);
        $res = getByDotPath($decoded, $dotPath);
        if (!$res['found']) {
            respondError("Path tidak ditemukan: {$dotPath}", 404);
        }
        respondJson([
            'file' => $resolved['rel'],
            'path' => $dotPath,
            'value' => $res['value'],
        ]);
    }

    if (isset($_GET['raw']) && $_GET['raw'] === '1') {
        echo $raw;
        exit;
    }

    $decoded = json_decode($raw, true);
    if (json_last_error() !== JSON_ERROR_NONE) {
        respondError('JSON pada berkas rusak: ' . json_last_error_msg(), 500);
    }

    respondJson([
        'file' => $resolved['rel'],
        'sizeBytes' => filesize($resolved['abs']),
        'updatedAt' => date('Y-m-d H:i:s', filemtime($resolved['abs'])),
        'data' => $decoded,
        'raw' => $raw,
    ]);
}

if ($method === 'DELETE') {
    $fileParam = isset($_GET['file']) ? (string)$_GET['file'] : '';
    $resolved = resolveExistingJsonFile($dataRoot, $fileParam);
    if ($resolved === null) respondError('Berkas JSON tidak ditemukan.', 404);
    if (!@unlink($resolved['abs'])) respondError('Gagal menghapus berkas.', 500);
    respondJson(['success' => true, 'deleted' => $resolved['rel']]);
}

if ($method === 'POST' || $method === 'PUT' || $method === 'PATCH') {
    $input = file_get_contents('php://input');
    if (!$input) {
        respondError('Body permintaan kosong.', 400);
    }
    $payload = json_decode($input, true);
    if (!is_array($payload)) {
        respondError('Body harus berupa JSON valid.', 400);
    }

    $defaultAction = ($method === 'PATCH') ? 'patch' : 'save';
    $action = (string)($_GET['action'] ?? ($payload['action'] ?? $defaultAction));
    $fileParam = (string)($_GET['file'] ?? ($payload['file'] ?? ''));

    if ($action === 'delete') {
        $resolved = resolveExistingJsonFile($dataRoot, $fileParam);
        if ($resolved === null) respondError('Berkas JSON tidak ditemukan.', 404);
        if (!@unlink($resolved['abs'])) respondError('Gagal menghapus berkas.', 500);
        respondJson(['success' => true, 'deleted' => $resolved['rel']]);
    }

    if ($action === 'patch') {
        $resolved = resolveExistingJsonFile($dataRoot, $fileParam);
        if ($resolved === null) respondError('Berkas JSON tidak ditemukan.', 404);
        $dotPath = (string)($payload['path'] ?? '');
        if ($dotPath === '') respondError('Parameter path wajib diisi.', 400);

        $raw = readFileLocked($resolved['abs']);
        $decoded = json_decode($raw ?: '{}', true);
        if (json_last_error() !== JSON_ERROR_NONE) {
            respondError('JSON eksisting tidak valid.', 500);
        }

        if (!empty($payload['delete'])) {
            if (!deleteByDotPath($decoded, $dotPath)) {
                respondError("Path tidak ditemukan: {$dotPath}", 404);
            }
        } else {
            if (!array_key_exists('value', $payload)) {
                respondError('Parameter value wajib diisi.', 400);
            }
            $val = $payload['value'];
            if (!setByDotPath($decoded, $dotPath, $val)) {
                respondError("Gagal memperbarui path: {$dotPath}", 400);
            }
        }

        $encoded = encodeFormattedJson($decoded);
        if ($encoded === null || !writeFileAtomic($resolved['abs'], $encoded)) {
            respondError('Gagal menulis berkas JSON.', 500);
        }
        respondJson([
            'success' => true,
            'file' => $resolved['rel'],
            'path' => $dotPath,
            'sizeBytes' => strlen($encoded),
            'updatedAt' => date('Y-m-d H:i:s'),
        ]);
    }

    if ($action === 'create' || $action === 'save') {
        $target = ($action === 'create')
            ? resolveTargetJsonFile($dataRoot, $fileParam)
            : resolveExistingJsonFile($dataRoot, $fileParam);

        if ($target === null) {
            respondError($action === 'create' ? 'Nama berkas tidak valid.' : 'Berkas JSON tidak ditemukan.', $action === 'create' ? 400 : 404);
        }
        if ($action === 'create' && file_exists($target['abs']) && empty($payload['overwrite'])) {
            respondError('Berkas sudah ada.', 409);
        }

        if (isset($payload['raw']) && is_string($payload['raw'])) {
            $decoded = json_decode($payload['raw'], true);
            if (json_last_error() !== JSON_ERROR_NONE) {
                respondError('Sintaks JSON tidak valid: ' . json_last_error_msg(), 400);
            }
        } elseif (array_key_exists('data', $payload)) {
            $decoded = $payload['data'];
        } else {
            $decoded = $action === 'create' ? new stdClass() : null;
            if ($decoded === null) {
                respondError('Harus menyertakan field raw atau data.', 400);
            }
        }

        $encoded = encodeFormattedJson($decoded);
        if ($encoded === null || !writeFileAtomic($target['abs'], $encoded)) {
            respondError('Gagal menyimpan berkas JSON.', 500);
        }

        respondJson([
            'success' => true,
            'file' => $target['rel'],
            'sizeBytes' => strlen($encoded),
            'updatedAt' => date('Y-m-d H:i:s'),
            'raw' => $encoded,
            'data' => $decoded,
        ]);
    }

    respondError("Aksi tidak dikenal: {$action}", 400);
}

respondError('Metode HTTP tidak didukung.', 405);
