# SYNERGY INDO CORPORA — TAHAP 3: DASHBOARD ADMIN PREMIUM
by Kastriva | untuk PT Synergy Indo Corpora

## 0. Status & batasan
- Tahap 1: website dan animasi tetap **tidak berubah**.
- Tahap 2: GAS publik **tetap read-only**. Jangan tambahkan doPost ke GAS publik yang sudah berjalan.
- Tahap 3: halaman `/admin/login`, `/admin` dengan login Google, editor profil/program/galeri. Untuk pengeditan diperlukan **GAS admin baru yang terpisah**, plus setting pada Vercel dan Google Cloud.
- Data `registrations` tidak ditampilkan dan tidak dapat diubah lewat API tahap ini. Pengiriman formulir peserta belum dibuat.
- Gambar masih menggunakan URL HTTPS, belum ada upload foto langsung.
- Tidak ada password admin di GitHub; admin masuk dengan Google melalui layanan resmi Google Identity Services.
- Saat backend admin belum disiapkan, halaman editor tidak dapat menyimpan perubahan (fail-closed).

## 1. Pasang kode pada repository lokal
1. Backup/cadangkan repo lokal, jangan ubah `main` sebelum pengujian.
2. Jalankan `APPLY_STAGE3.ps1` dari folder ZIP hasil ekstraksi. Script memeriksa Git bersih, lalu membuat branch lokal `feature/admin-stage3-secure` dan menyalin patch (tidak menyentuh kode GAS publik).
3. Dari folder proyek jalankan:
   ```powershell
   npm.cmd run typecheck
   npm.cmd run build
   npm.cmd run dev
   ```
4. Jika build lolos, commit dan push branch (jangan merge dulu):
   ```powershell
   git status
   git add .env.example app/admin app/api/admin components/admin lib/admin gas/AdminCode.gs docs/STAGE3_ADMIN.md
   git commit -m "feat: secure premium admin stage 3"
   git push -u origin feature/admin-stage3-secure
   ```
5. Buat Pull Request ke `main` di GitHub. Review dulu. Selama fitur belum dikonfigurasi, tidak perlu merge ke produksi.

## 2. Siapkan Google Login
1. Buka https://console.cloud.google.com/ pada akun yang dikelola perusahaan. Buat atau pilih project Google Cloud untuk website Synergy.
2. Google Auth Platform → Branding dan Audience (OAuth consent). Pilih internal/external sesuai kebutuhan; untuk mode testing, tambahkan email admin sebagai test user.
3. Clients → Create client → **Web application**.
4. Authorized JavaScript origins:
   - `http://localhost:3000` untuk test lokal
   - `https://synergy-indo-corpora.vercel.app` untuk website produksi
   - custom domain perusahaan kelak jika sudah tersedia
5. Copy **OAuth Client ID** (bukan Client Secret). Isi Vercel `GOOGLE_CLIENT_ID` dan file `.env.local` di PC Anda.
6. `ADMIN_ALLOWED_EMAILS` di Vercel dan `.env.local`: email Google yang disetujui oleh Synergy (pisahkan dengan koma).
7. `ADMIN_SESSION_SECRET`: buat acak minimal 32 karakter, disarankan 64+; berbeda dari rahasia GAS.

Untuk membuat dua secret berbeda di PowerShell (JANGAN posting hasil di chat/GitHub):
```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```
Jalankan **dua kali**, satu untuk `ADMIN_SESSION_SECRET` dan satu untuk `GAS_ADMIN_SECRET`.

## 3. Buat GAS ADMIN terpisah
1. Buka `https://script.google.com/home/projects/create` atau `script.google.com/create` dengan akun pengelola database.
2. Nama script: `SYNERGY_ADMIN_API_PRIVATE`.
3. Tempel seluruh isi `gas/AdminCode.gs` ke `Code.gs`. **Jangan tempel ke proyek GAS publik!**
4. Klik Project Settings → Script properties; tambahkan:
   - `SYNERGY_SPREADSHEET_ID` = ID spreadsheet `SYNERGY_WEBSITE_DB` milik perusahaan.
   - `SYNERGY_ADMIN_SECRET` = secret acak kedua dari langkah sebelumnya.
5. Jalankan fungsi penyiapan izin jika Google membutuhkan otorisasi spreadsheet: untuk skrip mandiri yang hanya berisi `doPost`, deployment/otorisasi dapat meminta persetujuan; dapat jalankan `readAdminContent_()` sementara dari dropdown editor, kemudian berikan izin akses hanya jika akun sudah tepat. Jangan membagikan secret.
6. Deploy → New deployment → Web app → Execute as: Me → Access: Anyone. URL admin masih publik secara jaringan, **tetapi semua aksi admin memerlukan secret server**. Di tingkat operasional, batasi kuota/monitor spam dan lakukan rotasi secret jika bocor.
7. Salin URL `/exec` ke `GAS_ADMIN_WEB_APP_URL` di Vercel (jangan masukkan `?resource=public`). Isi `GAS_ADMIN_SECRET` yang sama.
8. Tambahkan `GOOGLE_CLIENT_ID`, `ADMIN_ALLOWED_EMAILS`, `ADMIN_SESSION_SECRET` di Vercel Production. Lalu redeploy.
9. Jangan menyalin atau menaruh isi secret di file yang akan di-commit atau mengirimkan screenshot yang menampilkannya.

## 4. Uji secara bertahap
1. Buka `/admin/login` di localhost, login Google dengan email yang diizinkan.
2. Login email yang tidak diizinkan harus gagal. Buka `/admin` tanpa login juga harus diarahkan ke `/admin/login`.
3. Setelah admin GAS disiapkan, `/admin` menampilkan status koneksi dan daftar konten termasuk draft yang belum diterbitkan.
4. Ubah satu field demo kecil (misalnya `hero_title_1`). Klik Simpan. Buka Sheets untuk memverifikasi nilai terbaru.
5. Tunggu cache GAS/Next sekitar 5–10 menit untuk melihat perubahan di website publik.
6. Uji tambah 1 program sebagai **draft** (published=false) sehingga tidak tampil di publik. Kemudian aktifkan publish dari admin dan periksa setelah cache habis.
7. Jangan melakukan uji dengan data pendaftar asli; bagian pendaftaran belum aktif.

## 5. Keamanan dan batasan operasional
- Admin tidak dapat menulis sebelum login Google + cocok email allowlist + cookie sesi HTTP-only + request same-origin.
- Google ID token diverifikasi dengan sertifikat publik Google, audience, issuer, expiry, nonce dan `email_verified`.
- Secret GAS hanya ditransfer dari server Next.js ke Apps Script melalui HTTPS. Tidak ada nilai secret atau URL admin dalam `NEXT_PUBLIC_*`.
- GAS admin sengaja dipisah dari endpoint GAS publik yang bekerja saat ini.
- Gunakan satu akun Google perusahaan sebagai owner Sheets dan deployment GAS; berikan akses berbasis peran ke pengelola.
- Penggunaan paket hosting untuk situs customer komersial harus mengikuti ketentuan paket Vercel yang memperbolehkannya.
- Belum ada uji akhir terhadap environment Google/Vercel milik perusahaan sampai kredensial dipasang dan percobaan penulisan dilakukan.

## 6. Data selalu ada di Sheet
Admin menulis ke tab `site`, `programs`, `gallery` yang sudah ada. Baris maupun kolom lain tidak dihapus. Tab `registrations` tidak disentuh. Script menolak kolom tak dikenal, ID invalid, URL gambar selain HTTPS, dan teks panjang berlebihan.
