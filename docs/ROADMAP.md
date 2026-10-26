# Roadmap Implementasi by Kastriva

| Tahap | Isi | Kriteria selesai |
|---|---|---|
| 1 · Website premium Sinergi Global | Hero, running text, custom cursor, kartu 3D, horizontal scroll, galeri interaktif dan responsif | Preview visual konsisten di desktop dan mobile |
| 2 · Firebase CMS | Firebase project milik klien, Firestore site/program/gallery, server-side adapter, upload media | CMS membaca dan menyimpan data Firestore setelah browser QA |
| 3 · Keamanan admin | Google nonce + Firebase Authentication, session cookie, allowlist admin, Upstash rate limits, headers/CSP | Hanya admin berizin dapat mengakses; semua negative tests lulus |
| 4 · Rekrutmen | Vacancy management, formulir kandidat, CV privat, persetujuan/versi, status pipeline, audit dan retensi | Synthetic end-to-end tests lulus dan perusahaan menyetujui privasi |
| 5 · Production | Monitoring, backup/restore, SEO, aksesibilitas, optimasi media, materi final, deploy domain dan handover | Persetujuan klien serta semua release gate tertutup |

## Materi yang masih diperlukan dari Sinergi Global

1. Logo resmi SVG/PNG dan persetujuan pemakaian identitas.
2. Profil final, sejarah, legalitas, alamat kantor dan kontak resmi.
3. Daftar lowongan aktif dengan persyaratan dan masa berlaku.
4. Foto kegiatan asli yang disetujui untuk publikasi.
5. Pemberitahuan privasi final, identitas pengendali data, kontak dan retensi.
6. Firebase project/bucket/billing milik klien, daftar admin dan akses service account.
7. Detail penyedia/spesifikasi/OS/akses VPS untuk evaluasi pendukung saja. VPS bukan sumber database/storage utama pada arsitektur ini.
