# Roadmap Sinergi Global — Website Profil Perusahaan

## Tahap dan status

| Tahap | Status | Kriteria selesai |
|---|---|---|
| 1 · Frontend premium | Kode utama selesai; UAT visual manual masih perlu dilakukan | Desktop/mobile diuji, navigasi keyboard dan reduced motion lolos |
| 2 · CMS konten publik GAS | Endpoint read-only tersedia; konten resmi dan kepemilikan akun perlu diverifikasi | Hanya konten terbit yang keluar dari API publik; tidak ada data admin/kandidat |
| 3 · Admin CMS dan media | Kode login Google, editor konten, upload Drive, rate limit/nonce tersedia di repository; konfigurasi dan pengujian end-to-end masih diperlukan | Login allowlist, API admin, upload, fail-closed, audit, backup/restore, dan security QA lulus |
| 4 · CMS lowongan dinamis | Belum dibuat | Lowongan, kategori, dan negara berasal dari data terverifikasi dan bisa dikelola admin; draft tidak tampil publik |
| 5 · Minat kandidat dan CV | Sengaja nonaktif/belum siap | Backend privat milik perusahaan, validasi upload, anti-spam, privasi, retensi, akses, notifikasi, dan uji keamanan lulus |
| 6 · Peluncuran publik | Belum disetujui | Materi resmi, domain/hosting, SEO, UAT, monitoring, backup, dan rollback disetujui |

## Materi yang perlu disiapkan bersama klien

1. Logo resmi Sinergi Global, brand guide, serta logo grup/afiliasi dengan izin penggunaan.
2. Nama legal yang tepat untuk ditampilkan, hubungan Sinergi Global dengan PT Sinergi Corpora Group, dan bukti/rumusan legalitas yang disetujui.
3. Profil perusahaan, sejarah, cakupan layanan, visi-misi, alamat kantor, email, nomor WhatsApp, dan kanal sosial resmi.
4. Foto kegiatan asli dan caption; pastikan persetujuan publikasi orang yang terlihat serta hak penggunaan gambar.
5. Daftar lowongan aktif yang telah disetujui: judul, negara, kategori, ringkasan, persyaratan, status, dan tanggal berlaku. Jangan menampilkan contoh posisi sebagai lowongan aktif.
6. Negara tujuan dan bidang pekerjaan yang benar-benar tersedia.
7. Berita/panduan yang disetujui atau keputusan untuk menyembunyikan bagian tersebut hingga kontennya siap.
8. Video dan naskah pimpinan jika bagian tersebut akan ditampilkan.
9. Kebijakan privasi dan persetujuan kandidat sebelum formulir atau upload CV diaktifkan.
10. Akses domain, hosting, Google Workspace/Drive, spreadsheet, GAS, OAuth, dan akun layanan yang dikelola perusahaan.

## Aturan keamanan konten

- Setup GAS baru menggunakan nilai kosong dan tidak mempublikasikan foto stok sebagai kegiatan resmi.
- Endpoint GAS publik hanya membaca konten yang diizinkan; jangan menambahkan operasi tulis atau data kandidat ke sana.
- Gunakan deployment GAS admin yang terpisah. Jangan bagikan spreadsheet atau folder Drive untuk edit publik.
- Upload gambar CMS bukanlah upload CV kandidat; keduanya punya tujuan, akses, retensi, dan risiko yang berbeda.
- Jangan mengaktifkan indexing sebelum copy, legalitas, domain, dan seluruh materi publik disetujui.
- Jangan menyimpan atau menguji data pribadi kandidat asli di lingkungan pratinjau.

## Urutan kerja berikutnya

1. Selesaikan audit visual desktop/mobile dan dapatkan persetujuan desain.
2. Bangun CMS lowongan dinamis agar posisi/negara/bidang tidak lagi menjadi data hard-coded.
3. Verifikasi konfigurasi admin pada environment staging terpisah, termasuk Upstash, OAuth, GAS admin, Drive, dan backup/restore.
4. Masukkan materi resmi dan lakukan UAT bersama klien.
5. Bangun/aktifkan backend kandidat dan upload CV hanya setelah persetujuan privasi serta kontrol keamanan siap.
6. Lakukan gate rilis publik, domain/hosting, SEO indexing, monitoring, dan serah terima.
