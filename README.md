# SYNERGY INDO CORPORA — Premium Interactive Company Profile
### Tahap 1 · Frontend sinematik + GAS read-only · by Kastriva

Website Next.js berbahasa Indonesia dengan animasi modern dan struktur Google Apps Script untuk konten publik.

## Fitur yang sudah dibuat
- Hero fullscreen sinematik, headline beranimasi, parallax background.
- Custom cursor (desktop) dengan label interaktif.
- Running text otomatis yang berhenti ketika di-hover, berjalan lagi saat pointer menjauh.
- Card program: hover tilt 3D, highlight glass-like, gambar zoom, wheel-to-horizontal dan drag, juga tombol next/prev.
- Galeri foto interaktif: membesar/bergeser saat hover, responsif di HP.
- Scroll reveal teks, section filosofi, alur pembelajaran, dan footer **BY KASTRIVA**.
- Menghormati pengaturan `prefers-reduced-motion`.
- Mengambil data `site`, `programs`, `gallery` dari Google Sheets melalui Apps Script.
- ISR revalidasi 300 detik dan fallback konten demo jika GAS tidak tersedia.

## Cara menjalankan di Windows 10/11
1. Ekstrak ZIP proyek ke `D:\Kastriva\Synergy-Indo-Corpora` (lokasi bebas).
2. Buka PowerShell dari folder proyek.
3. Pastikan Node.js 20.9+ terpasang (disarankan Node.js 24).
4. Jalankan:

```powershell
cd D:\Kastriva\Synergy-Indo-Corpora
npm.cmd install
npm.cmd run dev
```

5. Buka browser: `http://localhost:3000`.
6. Website langsung menampilkan **konten demo** walaupun GAS belum dipasang.

> Jika `npm.cmd install` gagal, cek internet/proxy dan versi Node. Proyek belum diklaim selesai diuji build di lingkungan target; lakukan `npm.cmd run typecheck` dan `npm.cmd run build` setelah instalasi.

## Menghubungkan database Google Sheets
Ikuti panduan lengkap `gas/README_GAS.md`. Contoh file env:

```env
GAS_WEB_APP_URL=https://script.google.com/macros/s/DEPLOYMENT_ID/exec
```

Isi `.env.local` dari `.env.example`, kemudian restart server dev. URL disimpan pada server Next.js, bukan dibaca langsung dari browser.

## Konten yang masih placeholder dan wajib diganti
- Logo perusahaan (saat ini logo teks/monogram sementara).
- Foto hero dan galeri dari Unsplash (contoh, **bukan kegiatan asli PT Synergy Indo Corpora**).
- Nama dan detail program pelatihan.
- Sejarah, izin, alamat, kontak, dan foto fasilitas resmi.
- Data WhatsApp dan email (belum dibuat-buat).
- SEO indexing belum aktif secara sengaja sampai identitas resmi diverifikasi.

## Tahap selanjutnya (belum dibuat)
2. Setup GAS & Sheets milik perusahaan, masukkan profil / program / foto resmi, uji koneksi.
3. Admin CMS ber-login aman: kelola konten, galeri, SEO, audit log, pembatasan role.
4. Pendaftaran online LPK dengan proteksi spam, validasi, notifikasi, dan perlindungan data peserta.
5. QA interaksi detail desktop/mobile, Core Web Vitals, optimasi gambar/video, deployment/domain, dan serah terima.

## Catatan arsitektur
- `app/page.tsx` membaca konten menggunakan ISR. Animasi tetap diproses di browser menggunakan GSAP.
- Google Apps Script hanya expose kolom yang diterbitkan. Registrasi tidak pernah masuk endpoint publik.
- Untuk produksi, konfigurasi backup Sheets, kepemilikan akun perusahaan, monitoring layanan, dan hosting sesuai lisensi penggunaan komersial.
- Gambar menggunakan URL placeholder publik; untuk final sebaiknya pakai gambar teroptimasi dari storage/CDN milik perusahaan.
- `robots: noindex` diterapkan pada Tahap 1 karena materi konten masih demo.
