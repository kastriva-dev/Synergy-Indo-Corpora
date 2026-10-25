# Sinergi Global — Full Production Launch Gate

Status: DRAFT / RELEASE BLOCKED. Checklist ini bukan bukti bahwa kontrol telah lulus.

## Target rilis lengkap
- Situs profil dan lowongan hanya memakai data resmi yang diverifikasi.
- Form lamaran merekam persetujuan pemberitahuan privasi versi yang disetujui.
- CV PDF maksimal 5 MiB disimpan di bucket privat, diunggah memakai signed upload URL satu objek; service-role key hanya di server.
- Data kandidat disimpan di database privat, terpisah dari konten publik dan sheet CMS.
- Admin dapat membuat/memperbarui lowongan, meninjau kandidat, mengubah status, mengunduh CV dengan audit, dan menghapus/anonymize data.
- Retensi otomatis serta audit submit, status, unduhan CV, dan penghapusan telah diuji.

## Environment server-only
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY (server-only; jangan gunakan NEXT_PUBLIC_)
- CANDIDATE_PRIVACY_NOTICE_VERSION
- CANDIDATE_PRIVACY_NOTICE_APPROVED=true hanya setelah persetujuan legal/perusahaan dicatat
- CANDIDATE_RETENTION_DAYS (1–3650, sudah disetujui)
- CRON_SECRET
- GOOGLE_CLIENT_ID, ADMIN_ALLOWED_EMAILS, ADMIN_SESSION_SECRET
- Upstash Redis pair khusus Preview; Production memakai kredensial terpisah.
Jangan masukkan secret ke Git, PR, screenshot atau chat.

## Setup database/storage
1. Pilih proyek Supabase dedicated yang ACTIVE setelah pemilik meninjau biaya, region/data residency, dan hak akses.
2. Tinjau docs/RECRUITMENT_BACKEND_SETUP.sql, lalu pindahkan ke migration Supabase yang terlacak lewat alur CLI/migration sebelum dijalankan.
3. Pastikan RLS aktif; anon/authenticated tidak memiliki grant atau policy yang bisa membaca pelamar maupun CV.
4. Bucket candidate-cvs harus private, batas 5 MiB, MIME application/pdf. Uji signed upload dari origin Preview secara terpisah.
5. Gunakan lowongan sintetis untuk QA. Jangan publikasikan posisi contoh sebagai lowongan nyata.

## Gerbang legal dan operasional
- Identitas hukum pengendali data, kontak resmi, dasar pemrosesan, hak kandidat, retensi, penerima/prosesor, lokasi/transfer data lintas negara, dan prosedur penghapusan harus ada dalam pemberitahuan final berbahasa Indonesia.
- Perusahaan/legal harus menyetujui naskah dan versi privasi.
- Konfirmasi semua lowongan, kontak, foto/video, brand, legalitas serta domain resmi.
- Tetapkan pemilik operasional untuk permintaan data, insiden, backup, dan restore.
Tanpa approval privasi, versi, masa retensi, database, Storage, Redis, atau CRON_SECRET, endpoint lamaran tetap mati.

## Uji wajib Preview
- Lamaran uji menghasilkan satu record dan CV tertaut.
- Akses anonim/tebakan path untuk CV gagal; CV hanya diunduh lewat admin session.
- Tolak ukuran >5 MiB, konten non-PDF, upload expired/replay, job draft/kedaluwarsa, consent tidak dicentang, dan origin lintas situs.
- Tidak ada PII atau path CV di API publik, log rutin, error, atau halaman publik.
- Admin tanpa sesi mendapat 401; perubahan status memakai audit identitas admin.
- Penghapusan CV dan anonimisasi selesai; job retensi hanya memproses tanggal due yang telah disetujui.
- Rate limit menghasilkan 429; Redis gagal tertutup 503.
- Uji login, logout/expiry, CSRF, XSS, CSP, clickjacking, cache/header, mobile/accessibility, backup/restore dan respons insiden.
- Jalankan npm ci, typecheck, build, dependency audit dan browser regression.

## Blocker awal
- Belum ada proyek Supabase khusus rekrutmen yang aktif/terkonfirmasi.
- Koneksi Vercel yang tersedia saat pemeriksaan ini belum menampilkan team/project.
- Naskah privasi dan durasi retensi belum disetujui.
- QA PR security #1 dan #2 masih pending; belum ada test harness otomatis khusus.
- Belum ada lowongan nyata yang diverifikasi.
- Draft ini tidak mengubah environment, database, domain, atau deployment Production.
