# SYNERGY INDO CORPORA — STAGE 3.8 (BY KASTRIVA)

## Tujuan
Hardening tahap awal **tanpa mengubah situs produksi secara otomatis**. Berkas ini dibuat dari patch Stage 3.7 yang sudah dipakai pada pengujian dashboard, beserta source website Stage 1.

### Perubahan pada kode
- Komponen `SafeMediaImage`: gambar Google Drive yang gagal dimuat diganti dengan placeholder Synergy, bukan ikon gambar rusak. Di dashboard tersedia tautan **Periksa file di Google Drive** untuk gambar tersebut. Tidak menghapus atau mengganti file asli.
- URL media dipilih dari domain yang disetujui: `images.unsplash.com/photo-*` untuk contoh lama dan `drive.google.com/thumbnail?id=...&sz=w...` untuk media unggahan. URL lain ditolak oleh API admin dan diperlakukan sebagai tidak tersedia pada halaman.
- Validasi `Content-Type` dan field multipart upload; tetap memeriksa ukuran dan signature file seperti Stage 3.7.
- Di API Next.js dan GAS Admin, **konten baru tidak boleh dipublikasikan tanpa gambar**. Draft tanpa gambar masih bisa disimpan.
- GAS Admin mencatat log aktivitas minimal di tab `admin_audit` (timestamp, aksi, ID); tidak mencatat secret, token, atau isi data. Tab ini bisa dibuat otomatis saat ada perubahan setelah deploy GAS versi baru, dan tidak pernah dibaca API publik.

### PENTING mengenai Drive
Ini **tidak menjadikan Google Drive CDN**. Ada kemungkinan Google membatasi thumbnail walau izin berbagi gambar benar. Placeholder menjaga UI tetap baik, tetapi gambar aslinya belum tentu bisa tampil. Jika foto berulang kali gagal, solusi produksi adalah CDN/object storage yang secara resmi mendukung hotlink dan cache gambar.

## LANGKAH A — Backup / branch terpisah
Di Mini PC buka PowerShell, pastikan source Stage 3.7 dan GAS kode lokal sudah tersimpan di Git branch pengembangan.

```powershell
cd D:\Kastriva\Synergy-Indo-Corpora
git status --short
git branch --show-current
```

Jika ada perubahan lokal yang belum di-commit: **review file**, pastikan tak ada `.env.local` atau credential, lalu commit dengan pesan `Checkpoint sebelum Stage 3.8`. Jangan menjalankan `git add .` secara membabi buta jika ada secret. Jika branch masih `main`, buat branch baru sesudah menyimpan perubahan secara aman:

```powershell
git switch -c feature/media-security-stage38
```

## LANGKAH B — Instal file website lokal
Ekstrak ZIP ke misalnya `D:\Kastriva\Synergy-Stage38-Patch`. Jalankan:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File "D:\Kastriva\Synergy-Stage38-Patch\INSTALL_STAGE38.ps1" -ProjectRoot "D:\Kastriva\Synergy-Indo-Corpora"
cd D:\Kastriva\Synergy-Indo-Corpora
npm.cmd run typecheck
npm.cmd run build
npm.cmd run dev
```

Installer akan menolak `main` atau folder kerja Git yang belum bersih; menyimpan backup file terdahulu ke direktori TEMP; **tidak membaca, menyalin, atau mengubah `.env.local`**; dan tidak melakukan push/deploy.

## LANGKAH C — Uji browser lokal
1. Buka `http://localhost:3000/admin`, login Google.
2. Klik menu Program LPK dan Galeri, buka gambar yang sebelumnya gagal. Jika Drive memblokir hotlink, muncul placeholder yang rapi + tautan **Periksa file di Google Drive**.
3. Pastikan program dan galeri aktif masih muncul; draft **tidak muncul** di halaman publik.
4. Coba simpan draft tanpa gambar (boleh); coba publikasikan tanpa gambar (**harus ditolak**). Jika ada gambar, publish dan nonaktifkan kembali.
5. Buka laman publik lokal dan periksa animasi/scroll tetap mulus.
6. Jangan push ke `main` sebelum semua lolos. Jika sedang berada di branch pengembangan, push branch dan gunakan Vercel Preview untuk pengujian lanjutan.

## LANGKAH D — Update GAS Admin TERPISAH, setelah pemeriksaan lokal lulus
1. Salin `gas/AdminCode.gs` ke project **SYNERGY_ADMIN_API_PRIVATE**, setelah menyimpan backup kode aktif.
2. **Jangan ubah** script properties `SYNERGY_SPREADSHEET_ID` / `SYNERGY_ADMIN_SECRET` dan jangan ubah project GAS publik.
3. Save, jalankan `diagnoseAdminRead` yang sudah ada di Apps Script jika tersedia, dan pastikan `READ OK: true`.
4. Deploy → Manage deployments → Edit deployment aktif → New version → Deploy (URL tetap sama).
5. Uji satu edit profil kecil lalu rollback nilainya. Periksa adanya tab **admin_audit**; jangan share tab atau sheet ke publik.
6. Pastikan login admin, Program, Galeri, serta mode draft/publik masih bekerja di localhost.

## Keamanan yang masih WAJIB sebelum production
- Sistem rate limiting terdistribusi dan alert abuse, misalnya gateway yang dikelola.
- Audit privilege OAuth dan pembatasan siapa yang boleh membuat deployment GAS.
- Backup terjadwal Google Sheets + pemulihan; uji restore.
- Proses pembersihan file Drive yatim (upload berhasil tetapi tombol Simpan dibatalkan).
- Review hak publik file foto: `Anyone with link` membuat masing-masing foto dapat diakses oleh siapa saja yang memiliki URL.
- Evaluasi penggantian media dari Drive ke CDN jika klien memerlukan uptime dan gambar yang andal.
- Uji dependency vulnerabilities, session rotation, CSP dan keamanan transport sebelum admin diaktifkan di Vercel Production.

**Status:** patch dibuat dan pemeriksaan sintaks dilakukan di lingkungan pengembang; belum dipasang atau diuji pada PC klien. Semua perubahan produksi membutuhkan pengujian dan keputusan Anda.
