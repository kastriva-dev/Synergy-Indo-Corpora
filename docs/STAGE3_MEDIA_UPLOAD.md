# Sinergi Global — Upload foto ke Google Drive (by Kastriva)

1. **Jangan mengganti konfigurasi GAS publik.** Di project `SYNERGY_ADMIN_API_PRIVATE`, backup dulu `Code.gs`, lalu ganti dengan `gas/AdminCode.gs` dari patch ini. Kode sebelumnya tetap dipertahankan dan ditambah upload.
2. Simpan, pilih fungsi `setupSynergyMediaFolder` → Run → beri izin Google Drive. Fungsi hanya membuat folder jika `SYNERGY_MEDIA_FOLDER_ID` belum terisi; saat pertama kali run folder bernama `SINERGI_GLOBAL_WEBSITE_MEDIA` dibuat di Drive akun pemilik GAS. Cek Execution log untuk link folder. **Jangan share folder untuk edit publik.**
3. Deploy → Manage deployments → Edit → New version → Deploy. Pertahankan URL /exec yang sama.
4. Salin berkas Next.js patch (folder `components/admin`, `app/api/admin/upload`, `app/admin/admin.css`) ke proyek lokal di branch `feature/admin-stage3-secure`. Backup/commit pekerjaan lokal dahulu. Jangan salin `.env.local`.
5. `npm.cmd run typecheck` dan `npm.cmd run build`; jalankan `npm.cmd run dev`, login ke `/admin`. Program, Galeri, dan Lowongan memakai pemilih foto lokal, bukan kolom URL.
6. Pilih JPG/PNG/WEBP hingga 2,2MB, tunggu notifikasi upload, lalu klik Simpan Program/FOTO/Lowongan. Upload tanpa menyimpan konten menghasilkan file Drive yatim; hapus manual bila diperlukan.
7. Foto hanya dipublikasikan sebagai **viewer Anyone with link per file** agar dapat tampil pada pengunjung. Folder Drive tidak dibagikan publik. Periksa kebijakan organisasi, syarat penyimpanan Google Drive dan persetujuan pemilik hak foto sebelum mengunggah.

**Batasan:** Google Drive thumbnail bukan CDN resmi; tampilan embed/hotlink dapat dibatasi sewaktu-waktu, dan izin publik per file diperlukan. Untuk SLA perusahaan, pertimbangkan migrasi media ke Cloudinary, Firebase Storage atau object storage yang didukung CDN; tetap bisa memakai Sheets/GAS untuk database.

**Keamanan:** akses upload diautentikasi di server, cek origin dan tipe/tanda tangan file, batas ukuran dan secret server-side. Belum mencakup antivirus, rate limit terdistribusi, audit log upload, kuota per admin, validasi decode gambar mendalam, atau penghapusan file yatim. Jangan deploy admin ke production sebelum hardening dan pengetesan.
