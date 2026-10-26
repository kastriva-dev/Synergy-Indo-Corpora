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
- CMS lowongan dinamis kini sudah ditambahkan pada source Next.js dan GAS: admin dapat membuat/mengedit posisi, menyimpan draft atau menerbitkan, serta mengunggah foto melalui folder Drive media yang sama.
- Website mengambil lowongan terbit beserta kategori dan negara dari endpoint publik. Jika CMS terhubung tetapi belum ada posisi terbit, halaman menampilkan empty state, bukan data contoh. Data contoh hanya dipakai pada mode pratinjau/demo.
- Fitur tersebut belum operasional sampai source GAS publik/admin disalin dan dideploy, tab jobs dibuat melalui setup, dan alur end-to-end diuji. Formulir minat kandidat dan unggah CV tetap nonaktif; jangan mengaktifkannya dengan hanya menambahkan form di frontend.
- Materi legal, identitas, foto kegiatan, dan detail posisi final masih perlu disetujui perusahaan.
- Koneksi Vercel ke domain tim tidak tersedia untuk inspeksi browser otomatis pada sesi ini. Status build bukan pengganti UAT visual manual.
- `sinergiglobal.co.id` sudah menjadi basis metadata, tetapi DNS, sertifikat TLS, dan konfigurasi domain belum diverifikasi lewat pemeriksaan ini.
- Hosting final belum ditetapkan: pastikan VPS klien benar-benar tersedia dan mendukung runtime Next.js atau gunakan paket hosting yang mengizinkan penggunaan komersial.

## 3. Perhatian khusus untuk setup Google Sheets/GAS baru

- Source gas/Code.gs pada main memakai nilai kosong untuk tab baru, tidak menerbitkan foto stok sebagai kegiatan resmi, dan membuat tab jobs kosong jika belum ada. Fungsi setup hanya membuat tab yang belum ada; tab existing tidak ditimpa.
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

- [ ] Salin dan deploy versi terbaru gas/Code.gs dan gas/AdminCode.gs; jalankan setupSynergySpreadsheet() untuk membuat tab jobs bila belum ada.
- [ ] Uji CMS lowongan end-to-end: buat draft, pastikan tidak tampil publik, terbitkan, edit, batalkan publikasi, dan pastikan halaman kosong tidak menampilkan contoh sebagai lowongan aktif.
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
