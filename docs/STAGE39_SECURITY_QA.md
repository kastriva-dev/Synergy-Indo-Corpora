# Synergy Indo Corpora — Tahap 3.9 Security QA (by Kastriva)

## Scope
Tahap ini hanya mengubah branch `feature/admin-security-stage39`. `main`, GAS Admin live, Google Sheets produksi, dan environment Production Vercel tidak dimodifikasi.

### Perubahan
1. Tombol Simpan dan Upload dinonaktifkan sampai GET `/api/admin/content` berhasil dan mengembalikan format site/programs/gallery yang valid. Status koneksi tidak lagi sekadar memeriksa environment variable.
2. Header browser untuk halaman `/admin/**` dan `/api/admin/**`: no-store, noindex, nosniff, anti-framing, no-referrer, pembatasan permission, serta COOP yang kompatibel dengan popup Google.
3. GitHub Actions menjalankan `npm ci`, TypeScript dan production build tanpa menggunakan kredensial produksi.

## LANGKAH 1 — Integrasi branch tanpa menyentuh main
```powershell
cd D:\Kastriva\Synergy-Indo-Corpora
git status --short
git fetch origin
git switch feature/admin-security-stage39
git pull --ff-only
npm.cmd ci
npm.cmd run typecheck
npm.cmd run build
```

Branch baru dibuat dari `feature/media-security-stage38`. Simpan commit lokal dahulu jika `git status --short` menampilkan perubahan. **Jangan** `git reset --hard` atau force-push.

## LANGKAH 2 — Uji lokal dengan GAS staging / data aman
- Jalankan `npm.cmd run dev`. Pastikan Google login berhasil dan `GET /api/admin/content` merespons sukses.
- Buka `/admin` ketika GAS Admin sengaja *tidak tersedia* pada lingkungan pengujian. Pesan harus menjelaskan kegagalan dan Simpan/Upload harus **disabled**. Jangan memutus GAS produksi demi pengujian.
- Saat admin API tersedia, tunggu respons; baru tombol Simpan aktif.
- Periksa header di Chrome DevTools → Network untuk `/admin` dan `/api/admin/content` (`Cache-Control: private, no-store`, `X-Frame-Options: DENY`).
- Uji tanpa login menggunakan Incognito: `/admin` mengarah ke `/admin/login` dan `/api/admin/content` memberi 401.
- Uji draft: konten `published=false` tetap tersimpan di admin dan tidak muncul di situs publik.
- Pastikan login via popup Google masih bekerja dengan header COOP baru; jika gagal, **jangan merge** sampai diperbaiki.
- Verifikasi foto Drive yang gagal ter-fetch menampilkan placeholder, bukan ikon broken.

## LANGKAH 3 — Vercel Preview tanpa mengakses data produksi
- Jangan isi Preview dengan `GAS_ADMIN_SECRET` produksi, `ADMIN_SESSION_SECRET` produksi, atau Spreadsheet produksi.
- Untuk login Preview, gunakan OAuth Client Web khusus Preview, dengan `Authorized JavaScript origins` berisi **alamat deployment Preview yang tepat** (tanpa path dan tanpa wildcard).
- Untuk pengujian simpan di Preview, buat Spreadsheet pengujian serta GAS Publik/Admin pengujian terpisah; berikan secret baru dan atur Environment Variables pada scope Preview.
- Vercel Preview *tanpa* environment admin boleh dipakai untuk pemeriksaan tampilan; dashboard harus tetap read-only, bukan dimatikan guard-nya.
- Jangan gunakan shared Preview alias permanen sebagai redirect tanpa meninjau OAuth origins.

## LANGKAH 4 — Security gate sebelum Production
- Periksa GitHub Actions berstatus sukses; cek `npm audit --omit=dev --audit-level=high` dan tangani hasilnya.
- Terapkan **rate limiting terdistribusi** di edge/gateway untuk login, nonce, upload, dan write APIs; jangan menganggap rate limiter in-memory cukup untuk serverless.
- Lakukan pengujian CSRF, XSS, clickjacking, session expiry/logout, privilege dan ownership akses Google Cloud/GAS/Drive.
- Terapkan CSP yang cocok untuk Google GIS + Next.js; jangan langsung memakai CSP generik yang memblokir login atau animasi.
- Pastikan Google Sheets tidak pernah dibagikan `Anyone`; hanya file gambar yang memang dipublikasikan yang dapat diakses publik.
- Audit backup dan restore untuk Sheets dan Google Drive, termasuk retention serta file upload yang belum diikat dengan record.
- Audit log GAS sekarang menyimpan waktu/aksi/record ID namun **belum menyertakan identitas admin**, jadi bukan jejak audit lengkap. Jangan mengklaim sudah memenuhi standar forensik.
- Review penggunaan komersial hosting: Vercel Hobby tidak ditujukan untuk website bisnis produksi.
- Jangan merge `main` atau deploy admin production sampai kontrol ini diverifikasi.

## Rollback aman
Jika fitur login atau UI bermasalah, gunakan commit sebelumnya pada branch dev atau revert commit terkait dan tes ulang; biarkan `main` / Production tetap di versi sebelumnya.
