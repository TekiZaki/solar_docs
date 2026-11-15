# Panduan Menggunakan `json_files.php` Melalui Terminal

Endpoint `myapp/public/api/json_files.php` dapat dijalankan langsung lewat **PHP CLI** di terminal maupun lewat **HTTP (`curl` / PowerShell `Invoke-RestMethod`)** untuk melihat, mencari, dan mengedit seluruh berkas JSON di dalam `myapp/public/data/`.

---

## 1. Mode PHP CLI (Langsung di Server / Lokal)

Jalankan dari folder `myapp/`:

```bash
cd myapp
```

### Melihat semua berkas JSON
```bash
php public/api/json_files.php list
```

### Membaca isi berkas JSON
- Ringkasan terformat:
```bash
php public/api/json_files.php get reports/REPORT_MT_PLTS_JKT_SMPN_72.json
```
- Raw JSON murni:
```bash
php public/api/json_files.php get reports/REPORT_MT_PLTS_JKT_SMPN_72.json --raw
```
- Mengambil key tertentu dengan dot-path:
```bash
php public/api/json_files.php get reports/REPORT_MT_PLTS_JKT_SMPN_72.json --path=location.lokasi
php public/api/json_files.php get reports/REPORT_MT_PLTS_JKT_SMPN_72.json --path=measurements.0.hasilAfter --raw
```

### Mengedit key tertentu (`set`)
Mendukung tipe otomatis (`string`, `number`, `true`/`false`, `null`, maupun JSON object/array):
```bash
php public/api/json_files.php set reports/REPORT_MT_PLTS_JKT_SMPN_72.json location.lokasi "SMPN 72 Jakarta"
php public/api/json_files.php set reports/REPORT_MT_PLTS_JKT_SMPN_72.json hidePVAnalisis true
php public/api/json_files.php set reports/REPORT_MT_PLTS_JKT_SMPN_72.json measurements.0.hasilAfter "605 V"
```

### Menghapus key tertentu (`unset`)
```bash
php public/api/json_files.php unset reports/REPORT_MT_PLTS_JKT_SMPN_72.json photoSlots.slot_001.excludeFromDocx
```

### Menimpa seluruh isi berkas (`write`)
- Dari file lokal (`@path`):
```bash
php public/api/json_files.php write reports/test_berkas.json @./payload.json
```
- Dari stdin (`-`):
```bash
cat payload.json | php public/api/json_files.php write reports/test_berkas.json -
```
- Dari string JSON langsung:
```bash
php public/api/json_files.php write reports/test_berkas.json '{"ok":true,"catatan":"uji"}'
```

### Membuat & menghapus berkas JSON
```bash
php public/api/json_files.php create reports/baru.json '{"lokasi":"Jakarta"}'
php public/api/json_files.php delete reports/baru.json
```

---

## 2. Mode HTTP dengan `curl` (Linux / macOS / Git Bash)

Ganti `BASE_URL` sesuai lingkungan:
- Lokal Vite + PHP proxy: `http://localhost:3000/api/json_files.php`
- Produksi: `https://tekizaki.my.id/projects/public/solar-docs/api/json_files.php`

### Daftar semua berkas JSON
```bash
curl -s "http://localhost:3000/api/json_files.php"
```

### Ambil isi berkas atau raw JSON
```bash
curl -s "http://localhost:3000/api/json_files.php?file=reports/REPORT_MT_PLTS_JKT_SMPN_72.json"
curl -s "http://localhost:3000/api/json_files.php?file=reports/REPORT_MT_PLTS_JKT_SMPN_72.json&raw=1"
curl -s "http://localhost:3000/api/json_files.php?file=reports/REPORT_MT_PLTS_JKT_SMPN_72.json&path=location.lokasi"
```

### Edit key tertentu (`PATCH`)
```bash
curl -X PATCH "http://localhost:3000/api/json_files.php" \
  -H "Content-Type: application/json" \
  -d '{"file":"reports/REPORT_MT_PLTS_JKT_SMPN_72.json","path":"location.lokasi","value":"SMPN 72 Jakarta"}'
```

### Hapus key tertentu (`PATCH` dengan `"delete": true`)
```bash
curl -X PATCH "http://localhost:3000/api/json_files.php" \
  -H "Content-Type: application/json" \
  -d '{"file":"reports/REPORT_MT_PLTS_JKT_SMPN_72.json","path":"hidePVAnalisis","delete":true}'
```

### Simpan seluruh raw JSON (`POST` / `PUT`)
```bash
curl -X POST "http://localhost:3000/api/json_files.php" \
  -H "Content-Type: application/json" \
  -d '{"action":"save","file":"reports/test_berkas.json","data":{"catatan":"diperbarui via curl"}}'
```

### Buat & hapus berkas (`create` / `DELETE`)
```bash
curl -X POST "http://localhost:3000/api/json_files.php" \
  -H "Content-Type: application/json" \
  -d '{"action":"create","file":"reports/baru.json","data":{"aktif":true}}'

curl -X DELETE "http://localhost:3000/api/json_files.php?file=reports/baru.json"
```

---

## 3. Mode HTTP di Windows PowerShell (`Invoke-RestMethod`)

### Daftar semua berkas
```powershell
Invoke-RestMethod "http://localhost:3000/api/json_files.php" | Select-Object -ExpandProperty files | Format-Table file, sizeBytes, updatedAt
```

### Baca nilai key tertentu
```powershell
Invoke-RestMethod "http://localhost:3000/api/json_files.php?file=reports/REPORT_MT_PLTS_JKT_SMPN_72.json&path=location.lokasi"
```

### Edit key tertentu (`PATCH`)
```powershell
$body = @{
  file  = "reports/REPORT_MT_PLTS_JKT_SMPN_72.json"
  path  = "location.lokasi"
  value = "SMPN 72 Jakarta"
} | ConvertTo-Json

Invoke-RestMethod -Method Patch -Uri "http://localhost:3000/api/json_files.php" -ContentType "application/json" -Body $body
```

### Simpan seluruh berkas dari file lokal
```powershell
$raw = Get-Content -Raw .\payload.json
$body = @{
  action = "save"
  file   = "reports/test_berkas.json"
  raw    = $raw
} | ConvertTo-Json

Invoke-RestMethod -Method Post -Uri "http://localhost:3000/api/json_files.php" -ContentType "application/json" -Body $body
```
