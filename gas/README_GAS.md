# Legacy GAS archive — Sinergi Global

Google Apps Script + Google Sheets dipertahankan untuk kebutuhan sementara saat meeting/demo.

## Penggunaan sementara

- Website Preview dapat membaca CMS publik melalui environment variable `GAS_WEB_APP_URL`.
- Endpoint publik hanya membaca field terpilih dari sheet `site`, `programs`, dan `gallery`.
- Endpoint ini **read-only** untuk website. Data pelamar dan berkas CV tidak dikirim, disimpan, atau dibaca melalui endpoint publik GAS.
- Jika konten GAS masih memuat identitas lama Synergy Indo Corpora/LPK, website akan memakai konten pratinjau aman agar informasi lama tidak tampil di bawah merek Sinergi Global.
- Pastikan isi sheet yang memang ingin ditampilkan sudah ditinjau. Jangan gunakan data contoh sebagai informasi resmi perusahaan.

## Setelah meeting

Firebase milik klien tetap menjadi target CMS dan backend rekrutmen. Setelah konten disetujui dan dimigrasikan, hapus `GAS_WEB_APP_URL` dari environment Preview yang relevan dan verifikasi CMS Firebase. Jangan mengaktifkan formulir pelamar atau unggah CV hanya karena CMS GAS berhasil dibaca.

`AdminCode.gs` adalah gateway admin terpisah. Jangan menaruh URL/secret admin di browser, repositori, atau environment variable publik.
