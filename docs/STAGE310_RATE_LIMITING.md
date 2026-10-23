# Synergy Indo Corpora — Tahap 3.10: Rate Limiting dan Nonce Sekali Pakai

## Tujuan
Tahap ini menambahkan pembatasan permintaan terdistribusi untuk API admin dan mencegah pemakaian ulang nonce login. Perubahan hanya berada di branch \`feature/admin-security-stage310\`; tidak mengubah \`main\`, deployment Production, GAS live, atau spreadsheet produksi.

## Perubahan kode
- Rate limiting Redis terdistribusi menggunakan Upstash REST API.
- Nonce login ditandai sebagai sudah digunakan secara atomik (\`SET ... NX EX\`) setelah Google ID token lolos verifikasi.
- Jika Upstash gagal atau belum dikonfigurasi pada runtime Production/Preview, endpoint admin terkait **fail closed** dengan HTTP 503. Proteksi tidak diam-diam dimatikan.
- Saat development lokal tanpa Upstash, ada fallback in-memory untuk membantu pengembangan. Fallback ini tidak digunakan di Production/Preview.
- IP dan identitas admin di-hash sebelum menjadi bagian key Redis; nonce mentah tidak disimpan.

## Batas awal
| Endpoint | Batas |
|---|---:|
| Ambil nonce login | 30 permintaan/menit per IP |
| Login Google | 8 percobaan/10 menit per IP |
| Baca konten admin | 60 permintaan/menit per IP dan identitas admin |
| Simpan konten admin | 20 permintaan/menit per IP dan identitas admin |
| Upload media | 12 permintaan/10 menit per IP dan identitas admin |

Nilai ini adalah batas awal yang dapat disesuaikan setelah pengujian penggunaan nyata.

## Konfigurasi Upstash — dilakukan pada tahap konfigurasi environment
1. Buat database Redis di akun Upstash yang dikelola pemilik proyek.
2. Ambil **REST URL** dan **REST Token** dari detail database. URL harus HTTPS dan host berakhiran \`.upstash.io\`.
3. Simpan sebagai environment variables server-side:
   - \`UPSTASH_REDIS_REST_URL\`
   - \`UPSTASH_REDIS_REST_TOKEN\`
4. Jangan gunakan prefix \`NEXT_PUBLIC_\`, jangan masukkan nilainya ke GitHub, dan jangan tempelkan token ke chat.
5. Buat database/credential terpisah untuk Preview dan Production. Jangan berbagi rate-limit key antar lingkungan.
6. Untuk Production, tambahkan keduanya pada Vercel → Project → Settings → Environment Variables → Production. Untuk Preview, gunakan database staging terpisah. Terapkan ulang deployment setelah variabel disetel.

**Belum perlu mengubah Vercel sekarang.** Lakukan saat tahap final konfigurasi environment, setelah kode selesai. Production tetap memakai branch/deployment yang sekarang.

## Urutan integrasi lokal
\`\`\`powershell
cd D:\\Kastriva\\Synergy-Indo-Corpora
git status --short
git fetch origin
git switch --track origin/feature/admin-security-stage310
npm.cmd ci
npm.cmd run typecheck
npm.cmd run build
\`\`\`

Jika branch sudah pernah di-checkout, gunakan \`git switch feature/admin-security-stage310\` lalu \`git pull --ff-only\`. Jangan memakai \`git reset --hard\` atau force-push. Bila \`git status --short\` menunjukkan perubahan lokal, simpan/commit dahulu sebelum berpindah branch.

## Pemeriksaan akhir (ditunda hingga semua tahap setup selesai)
- GitHub Actions TypeScript dan production build lulus.
- Dengan staging Upstash, pastikan batas permintaan menghasilkan 429 dan pemakaian ulang nonce ditolak.
- Tanpa Upstash di Preview/Production, endpoint admin terkait harus 503 (fail closed).
- Login normal harus tetap berfungsi saat Upstash staging sudah dikonfigurasi.
- Jangan uji dengan mematikan Redis atau mengubah environment Production aktif.
- Jangan merge ke \`main\` atau deploy Production sampai seluruh security gate di \`docs/STAGE39_SECURITY_QA.md\` juga terpenuhi.
