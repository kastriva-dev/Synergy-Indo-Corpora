# Setup GAS + Google Sheets (Tahap 1)

## 1. Buat Sheets milik perusahaan
1. Masuk ke Google Drive akun resmi perusahaan. Buat Google Sheets: `SYNERGY_WEBSITE_DB`.
2. Dari Sheets pilih **Extensions / Ekstensi → Apps Script**.
3. Ganti isi `Code.gs` di Apps Script dengan isi file `gas/Code.gs` ini.
4. Simpan. Pilih fungsi **setupSynergySpreadsheet**, klik **Run / Jalankan** sekali. Berikan izin yang diminta Google.
5. Akan dibuat tab `site`, `programs`, `gallery`, `jobs`, dan `registrations`. Fungsi ini hanya membuat tab yang belum ada dan **tidak menimpa tab lama**.

## 2. Publikasikan konten
- Ubah nilai pada tab `site` untuk teks profil, kontak, dan judul.
- Pada kolom `published`, pakai checkbox TRUE agar baris tampil publik. Tab `jobs` memakai kolom `id, title, country, category, summary, image_url, published, order`; jangan terbitkan posisi sebelum detailnya disetujui perusahaan.
- Foto memakai `image_url` dari tempat penyimpanan gambar publik berbasis HTTPS.
- `registrations` **PRIVATE**, tidak boleh dibagikan ke publik. Belum ada form pendaftaran pada Tahap 1.

## 3. Deploy Apps Script
1. Klik **Deploy → New deployment → Web app**.
2. **Execute as:** Me (akun perusahaan pemilik Sheets).
3. **Who has access:** Anyone (termasuk tanpa login), karena endpoint ini hanya mengembalikan **konten yang sudah dipublikasikan**.
4. Klik **Deploy**, setujui izin, salin URL yang berakhir `/exec`.
5. Tes: `<URL_EXEC>?resource=health` → seharusnya ada `"ok":true`.
6. Tes: `<URL_EXEC>?resource=public` → terlihat JSON `site`, `programs`, `gallery`, dan `jobs`. Hanya lowongan berstatus TRUE yang dikirim ke endpoint publik.

**Penting:** Jangan menambahkan endpoint menulis, edit, menghapus, login admin, atau data pendaftar ke deployment GAS publik ini. Untuk tahap admin kita buat kanal terpisah dengan autentikasi dan otorisasi.

## 4. Sambungkan Next.js
- Copy `.env.example` menjadi `.env.local` di folder proyek.
- Isi `GAS_WEB_APP_URL=https://script.google.com/macros/s/.../exec`
- Restart Next.js (`Ctrl+C`, jalankan `npm.cmd run dev` lagi).
- Konten website server-side di-cache/di-revalidasi sekitar 5 menit. Pembaruan Sheets tidak selalu langsung muncul.
- Jika Apps Script tidak bisa diakses, website menggunakan konten demo bawaan sebagai cadangan. Sebelum live, ganti demo ini dengan konten final yang sudah divalidasi.

## Deploy ulang untuk CMS lowongan

Setelah perubahan source ini disetujui di GitHub, pemilik akun perusahaan perlu menyalin file gas/Code.gs ke project GAS publik, lalu memilih Deploy → Manage deployments → Edit → New version → Deploy. Jalankan setupSynergySpreadsheet() dari project GAS yang terhubung ke Google Sheets agar tab jobs dibuat jika belum ada. Fungsi setup tidak menimpa tab existing. Salin juga file gas/AdminCode.gs ke project GAS admin privat dan deploy versi baru agar aksi read_content dan upsert_job tersedia. URL /exec dan secret yang sudah dipakai tetap dijaga; jangan menaruh secret di GitHub. Perubahan source GitHub tidak otomatis mengubah deployment GAS.

**Penting — Script Properties GAS admin terpisah:** Pada project GAS admin privat (misalnya `SYNERGY_ADMIN_API_PRIVATE`), buka **Project Settings → Script Properties** dan pastikan `SYNERGY_SPREADSHEET_ID` berisi ID spreadsheet perusahaan yang sama serta `SYNERGY_ADMIN_SECRET` berisi secret acak minimal 32 karakter (disarankan 64+). Nilai `SYNERGY_ADMIN_SECRET` harus sama persis dengan environment variable `GAS_ADMIN_SECRET` pada Vercel. Di Vercel, `GAS_ADMIN_WEB_APP_URL` harus menunjuk ke URL `/exec` deployment GAS admin privat. Script Properties dari project GAS publik tidak otomatis tersedia pada project admin yang terpisah. Jangan pernah memasukkan secret ke GitHub, dokumentasi publik, atau frontend.

## Keamanan dan biaya
- Jangan mengaktifkan `Share → Anyone with link` untuk Google Sheets itu sendiri. Yang publik hanyalah API konten terpilih.
- Jangan simpan password, akses admin, PIN, atau data sensitif pada tab `site`, `programs`, `gallery`.
- GAS memiliki kuota harian dan batas waktu eksekusi; bukan database relasional atau SLA uptime 100%.
- Hosting Next.js yang mendukung server rendering/ISR diperlukan untuk cara integrasi yang diberikan. Vercel Hobby tidak untuk website bisnis komersial; gunakan layanan hosting yang memperbolehkan pemakaian komersial.
