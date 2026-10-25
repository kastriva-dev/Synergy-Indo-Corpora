import Link from "next/link";

export const metadata = {
  title: "Pemberitahuan Privasi Kandidat | Sinergi Global",
  robots: { index: false, follow: false },
};

export default function CandidatePrivacyPage() {
  return <main style={{ maxWidth: 820, margin: "0 auto", padding: "48px 24px", lineHeight: 1.7 }}>
    <p><Link href="/">← Kembali ke Sinergi Global</Link></p>
    <h1>Pemberitahuan Privasi Kandidat</h1>
    <p><strong>Status dokumen: DRAF — belum disetujui untuk penggunaan resmi.</strong></p>
    <p>Formulir lamaran tetap nonaktif sampai perusahaan melengkapi dan menyetujui pemberitahuan ini, menentukan dasar pemrosesan dan masa retensi, serta memasang versi yang disetujui.</p>
    <h2>1. Pengendali data dan kontak</h2><p>Identitas hukum pengendali data, alamat resmi, serta kanal untuk permintaan privasi harus dilengkapi dan diverifikasi oleh perusahaan.</p>
    <h2>2. Data yang diproses</h2><p>Rancangan formulir dapat memproses nama, nomor telepon, alamat email jika diisi, pilihan lowongan/negara, CV PDF, waktu persetujuan, dan metadata teknis minimum untuk mencegah penyalahgunaan.</p>
    <h2>3. Tujuan dan dasar pemrosesan</h2><p>Tujuan rekrutmen, dasar pemrosesan yang sah, serta lingkup persetujuan harus ditetapkan dalam naskah final sebelum data kandidat dikumpulkan.</p>
    <h2>4. Penyimpanan dan penerima data</h2><p>Rancangan sementara menggunakan Google Sheets privat untuk data kandidat dan Google Drive privat untuk CV, pada akun pemilik deployment Apps Script. Pemilik akun, akses, lokasi pemrosesan, penyedia layanan, dan kemungkinan transfer lintas negara harus dikonfirmasi dan dijelaskan dalam versi final sebelum pengumpulan data.</p>
    <h2>5. Retensi, penghapusan, dan hak kandidat</h2><p>Perusahaan harus menentukan durasi retensi tertulis, proses permintaan akses/koreksi/penghapusan, kanal pengaduan, dan cara menghubungi pengendali data.</p>
    <h2>6. Persetujuan dan versi dokumen</h2><p>Versi pemberitahuan, waktu persetujuan, dan hubungan persetujuan dengan lamaran akan direkam. Jangan unggah CV asli sebelum formulir dinyatakan aktif dalam lingkungan produksi yang sudah disetujui.</p>
    <p><strong>Catatan:</strong> ini kerangka kerja, bukan nasihat hukum atau pemberitahuan resmi. Jangan mengaktifkan pengumpulan data berdasarkan draf ini.</p>
  </main>;
}
