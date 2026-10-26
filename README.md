# SINERGI GLOBAL — Premium Interactive Recruitment Website
### Next.js · Firebase · by Kastriva

Website company profile Sinergi Global dengan pengalaman interaktif premium, CMS admin, lowongan kerja, dan alur lamaran kandidat. Proyek ini mengadaptasi repository Synergy Indo Corpora yang telah ada; tidak dibangun ulang dari nol.

## Fitur website

- Hero sinematik, headline animasi, custom cursor dan running text yang berhenti ketika pointer mendekat.
- Kartu 3D/glassmorphism, horizontal scroll dan galeri visual interaktif.
- Layout responsif desktop, tablet dan ponsel; menghormati preferensi reduced motion.
- CMS admin untuk konten profil, kartu layanan/konten, galeri dan unggah media.
- Pengelolaan lowongan serta dashboard kandidat.
- Firebase Authentication untuk identitas admin, Cloud Firestore untuk konten/rekrutmen dan Cloud Storage untuk media serta CV privat.
- Formulir kandidat tetap terkunci sampai persetujuan privasi tertulis dan gerbang rilis terpenuhi.

## Menjalankan lokal di Windows

1. Ekstrak proyek ke D:\Kastriva\Synergy-Indo-Corpora.
2. Buka PowerShell pada folder proyek.
3. Gunakan Node.js 24 bila tersedia.
4. Salin .env.example menjadi .env.local, lalu jalankan npm.cmd ci dan npm.cmd run dev.
5. Buka http://localhost:3000.

Website masih dapat menampilkan fallback demo saat environment Firebase belum diatur. Konten demo bukan lowongan resmi atau data perusahaan yang sudah diverifikasi.

## Backend Firebase

Runtime website tidak lagi memanggil GAS/Google Sheets/Drive. Panduan setup project, service account, billing, rules dan migrasi konten tersedia di docs/FIREBASE_SETUP.md. Source lama pada folder gas/ dipertahankan hanya sebagai arsip.

Perubahan kode tidak membuat Firebase project, Storage bucket, billing atau secret environment secara otomatis. Firebase project, data dan metode pembayaran harus dimiliki perusahaan. Jangan meletakkan service-account private key di Git atau environment yang dibaca browser.

## Gerbang rilis

Status tetap DRAFT. Baca docs/PRODUCTION_LAUNCH_GATE.md untuk pemeriksaan wajib. Jangan mengaktifkan formulir kandidat atau mengunggah CV asli sebelum pemberitahuan privasi, retensi, kontrol akses, integrasi Firebase, penghapusan, backup/restore dan browser QA disetujui.

## Materi resmi yang masih diperlukan

- Logo, foto dan materi perusahaan yang disetujui.
- Profil perusahaan, legalitas, alamat kantor dan kontak resmi.
- Lowongan resmi beserta persyaratan dan masa berlaku.
- Pemberitahuan privasi final, pengendali data dan masa retensi.
- Akses project Firebase milik perusahaan, domain Preview, daftar admin dan billing.
- Detail VPS yang diberikan klien jika perlu dievaluasi untuk peran pendukung. VPS tidak menjadi database utama dalam arsitektur Firebase ini.
