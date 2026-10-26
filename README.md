# Sinergi Global — Website Profil Perusahaan

> Nama repository masih `Synergy-Indo-Corpora` karena berasal dari proyek lama yang diadaptasi. Brand website yang sedang disiapkan adalah **Sinergi Global**.

Website Next.js dengan tampilan premium, animasi interaktif, CMS konten berbasis Google Apps Script/Sheets, dan dashboard admin yang terpisah dari API publik.

## Status saat ini

- Frontend premium: hero sinematik, custom cursor desktop, kartu 3D, ticker yang berhenti saat pointer mendekat, galeri horizontal, scroll reveal, dan dukungan `prefers-reduced-motion`.
- Integrasi konten publik GAS: **read-only** untuk profil, program/materi, galeri, dan lowongan terbit.
- Admin CMS: kode login Google, pengelolaan profil, lowongan (draft/publikasi), program/materi, galeri, dan upload foto ke folder Google Drive khusus tersedia di repository; deployment GAS serta security QA end-to-end masih menjadi syarat sebelum operasional.
- Lowongan, kategori bidang, dan negara tujuan mengikuti CMS saat source GAS terbaru sudah dideploy. Pada mode demo, contoh posisi tetap diberi label contoh; pada CMS terhubung tanpa lowongan terbit, website menampilkan empty state. Berita dan alur proses masih berupa konten contoh/desain.
- Formulir minat kandidat dan unggah CV belum aktif. Jangan mengumpulkan data pribadi kandidat pada tahap pratinjau.
- Metadata masih memakai `noindex, nofollow` sampai konten, legalitas, domain, privasi, dan persetujuan perusahaan diverifikasi.
- Konten demo dan gambar stok tidak boleh dianggap sebagai lowongan, kegiatan, atau klaim resmi perusahaan. Perubahan source di GitHub tidak otomatis mengubah deployment GAS; ikuti instruksi pada gas/README_GAS.md.

## Menjalankan secara lokal (Windows)

Memerlukan Node.js yang mendukung versi Next.js pada `package.json`.

```powershell
cd D:\Kastriva\Synergy-Indo-Corpora
npm.cmd ci
npm.cmd run typecheck
npm.cmd run build
npm.cmd run dev
```

Buka `http://localhost:3000`.

## Konfigurasi environment

Salin `.env.example` menjadi `.env.local` untuk pengembangan lokal. Jangan commit `.env.local`, secret, atau token ke GitHub.

| Variabel | Kegunaan |
|---|---|
| `GAS_WEB_APP_URL` | Endpoint GAS publik read-only; hanya untuk konten yang boleh dilihat pengunjung |
| `GOOGLE_CLIENT_ID` | OAuth Client ID publik untuk login Google admin |
| `ADMIN_ALLOWED_EMAILS` | Daftar email admin yang diizinkan |
| `ADMIN_SESSION_SECRET` | Secret sesi admin, server-side |
| `GAS_ADMIN_WEB_APP_URL` | Endpoint GAS admin terpisah; jangan gunakan endpoint publik |
| `GAS_ADMIN_SECRET` | Secret server-side yang harus cocok dengan Script Properties GAS admin |
| `UPSTASH_REDIS_REST_URL` | Endpoint Upstash untuk rate limiting/nonce admin di Preview/Production |
| `UPSTASH_REDIS_REST_TOKEN` | Token Upstash server-side |

Jangan gunakan prefix `NEXT_PUBLIC_` untuk secret. Untuk Preview dan Production, gunakan environment dan credential staging/production yang terpisah.

## Dokumentasi utama

- [Roadmap implementasi](docs/ROADMAP.md)
- [Release readiness dan checklist peluncuran](docs/SINERGI_GLOBAL_RELEASE_READINESS.md)
- [Rilis pratinjau sementara](docs/TEMPORARY_PRESENTATION_RELEASE.md)
- [Security QA admin](docs/STAGE39_SECURITY_QA.md)
- [Rate limiting dan nonce](docs/STAGE310_RATE_LIMITING.md)
- [Upload media Google Drive](docs/STAGE3_MEDIA_UPLOAD.md)
- [Setup GAS + Google Sheets](gas/README_GAS.md)

## Catatan rilis dan hosting

- Alias Vercel yang digunakan untuk presentasi: `https://synergy-indo-corpora.vercel.app/`. Ini bukan bukti bahwa domain produksi final sudah siap.
- Metadata domain disiapkan untuk `sinergiglobal.co.id`; DNS, TLS, dan konfigurasi domain tetap harus diverifikasi.
- Pilihan hosting harus disepakati dengan perusahaan. Jika memakai VPS klien, pastikan akses, OS, runtime Node.js, reverse proxy, HTTPS, backup, monitoring, dan prosedur rollback benar-benar tersedia. Jika tetap memakai Vercel, gunakan paket yang mengizinkan penggunaan komersial.
- API GAS publik tidak boleh dipakai untuk menulis atau menerima CV. Data kandidat memerlukan backend privat, persetujuan privasi, kontrol akses, retensi/penghapusan data, serta pengujian keamanan tersendiri.

**Rilis publik belum disetujui.** Lihat checklist rilis sebelum mengaktifkan indexing, lowongan nyata, pendaftaran, atau upload CV.
