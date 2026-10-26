# Sinergi Global — Release Readiness & Handover

**Snapshot:** 26 Oktober 2026  
**Status:** Pratinjau desain / belum disetujui untuk peluncuran publik.

## 1. Yang sudah ada

- Frontend Next.js dengan animasi premium, custom cursor desktop, tilt kartu, smart ticker, galeri horizontal, dan reduced-motion support.
- Public GAS endpoint dirancang read-only untuk konten yang diterbitkan.
- Dashboard admin di repository memakai login Google dan allowlist email, serta memiliki kode editor konten dan upload foto ke folder Google Drive khusus.
- Perbaikan aksesibilitas navigasi mobile dan tombol galeri sudah digabung ke `main`; status deployment Vercel untuk commit terakhir tercatat sukses.
- API publik tidak dirancang untuk menyimpan pendaftaran atau CV.

## 2. Batasan yang masih aktif

- Metadata website masih `noindex, nofollow`.
- Homepage memiliki lowongan, kategori bidang, negara tujuan, artikel/panduan, dan alur proses berbasis data contoh/hard-coded. Lowongan belum berasal dari CMS.
- Admin CMS saat ini mengelola profil, program/materi, dan galeri; belum ada tab untuk mengelola lowongan.
- Formulir minat kandidat dan unggah CV belum aktif. Jangan mengaktifkannya dengan hanya menambahkan form di frontend.
- Materi legal, identitas, foto kegiatan, dan detail posisi final masih perlu disetujui perusahaan.
- Koneksi Vercel ke domain tim tidak tersedia untuk inspeksi browser otomatis pada sesi ini. Status build bukan pengganti UAT visual manual.
- `sinergiglobal.co.id` sudah menjadi basis metadata, tetapi DNS, sertifikat TLS, dan konfigurasi domain belum diverifikasi lewat pemeriksaan ini.
- Hosting final belum ditetapkan: pastikan VPS klien benar-benar tersedia dan mendukung runtime Next.js atau gunakan paket hosting yang mengizinkan penggunaan komersial.

## 3. Perhatian khusus untuk setup Google Sheets/GAS baru

- Source `gas/Code.gs` sebelumnya memiliki seed contoh LPK/Synergy Indo Corpora dan foto Unsplash berstatus published. Versi repository yang sedang disiapkan di branch perbaikan mengubah default menjadi kosong agar data contoh tidak terbit otomatis.
- Fungsi setup hanya membuat tab yang belum ada; ia tidak menghapus atau mengganti sheet yang sudah ada. Karena itu, audit konten pada spreadsheet yang sudah digunakan secara terpisah sebelum deployment GAS baru.
- Endpoint publik hanya boleh mengeluarkan kolom konten yang memang disetujui untuk publik. Tab pendaftaran, rahasia, dan data kandidat tidak boleh dikirim dari API tersebut.
- Folder media Drive bukan tempat untuk CV. File foto CMS yang dibagikan melalui tautan publik harus hanya berisi aset yang memang boleh dilihat publik.

## 4. Gate konten sebelum peluncuran

- [ ] Nama brand dan nama badan hukum disetujui.
- [ ] Klaim tentang grup perusahaan, pengalaman operasional, izin P3MI, afiliasi, dan cakupan negara diverifikasi oleh perusahaan; jangan mempublikasikan klaim yang belum didukung dokumen/konfirmasi.
- [ ] Logo, foto kegiatan, video pimpinan, caption, dan hak publikasi disetujui.
- [ ] Kontak, alamat, kanal resmi, serta jalur pertanyaan kandidat dikonfirmasi.
- [ ] Lowongan aktif, negara tujuan, kategori, syarat, status, dan tanggal berlaku divalidasi.
- [ ] Semua label demo/contoh dihapus hanya setelah data resmi menggantikannya.
- [ ] Kebijakan privasi dan persetujuan pemrosesan data disetujui sebelum formulir kandidat dibuat aktif.

## 5. Gate CMS dan keamanan

- [ ] Spreadsheet dan Google Drive dimiliki/dikelola akun perusahaan dengan pemilik dan akses cadangan yang jelas.
- [ ] GAS publik dan GAS admin merupakan deployment terpisah; spreadsheet tidak dibagikan untuk edit publik.
- [ ] OAuth client, allowlist email admin, secret sesi, dan secret GAS telah dikonfigurasi tanpa memasukkan secret ke Git.
- [ ] Upstash REST URL/token tersedia di Preview/Production sesuai environment dan endpoint admin fail-closed saat layanan rate limit tidak tersedia.
- [ ] Pengujian login, email di luar allowlist, sesi kedaluwarsa/logout, nonce sekali pakai, rate limit, CSRF, XSS, clickjacking, dan respons API tanpa login selesai.
- [ ] Upload foto diuji dengan format/ukuran valid dan tidak valid; backup serta penghapusan file yatim memiliki prosedur.
- [ ] Audit log, backup/restore, monitoring, dan rollback diuji. Jangan menyebut audit log lengkap bila identitas admin belum tercatat.
- [ ] Tidak ada data kandidat asli di Preview atau demo.

## 6. Gate lowongan dan pendaftaran

- [ ] Tambahkan skema dan editor CMS lowongan; hanya posisi terbit yang boleh tampil di homepage.
- [ ] Pastikan halaman lowongan kosong menampilkan empty state yang jelas, bukan daftar contoh seolah aktif.
- [ ] Jika perusahaan menginginkan form minat/unggah CV, bangun backend privat milik perusahaan, validasi file, anti-spam, pembatasan akses, notifikasi, retensi/penghapusan, dan audit.
- [ ] Tetapkan siapa yang dapat membaca CV, berapa lama disimpan, bagaimana kandidat meminta penghapusan, serta bagaimana backup dienkripsi/dibatasi.
- [ ] Uji end-to-end dengan data dummy sebelum memakai data asli.

## 7. Gate teknis dan domain

- [ ] `npm ci`, TypeScript, build Next.js, audit dependensi, dan pemeriksaan Vercel Preview semuanya sukses pada commit kandidat rilis.
- [ ] UAT manual di HP dan desktop: tidak ada layout terpotong/gulir horizontal; menu keyboard, galeri, animasi, reduced-motion, tautan, dan empty state diuji.
- [ ] Domain `sinergiglobal.co.id`, DNS, HTTPS/TLS, canonical URL, Open Graph, favicon, dan email/kontak diverifikasi.
- [ ] Keputusan hosting komersial disetujui; jika memakai VPS, uji proses deploy, restart, SSL renewal, backup, log, monitoring, firewall, dan rollback.
- [ ] Indexing baru diaktifkan setelah semua gate lulus; periksa robots, sitemap, dan metadata setelah perubahan.
- [ ] Klien menyetujui tampilan, konten, kebijakan, dan tanggal peluncuran secara tertulis.

## 8. Keputusan rilis

**Jangan tandai website sebagai produksi penuh** hanya karena build/deployment sukses. Rilis publik memerlukan konten resmi, CMS lowongan yang benar, UAT manual, hosting/domain terverifikasi, keamanan admin, dan keputusan privasi. Sampai itu selesai, pertahankan status pratinjau dan `noindex`.
