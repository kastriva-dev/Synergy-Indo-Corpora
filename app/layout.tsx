import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Synergy Indo Corpora | Membangun Kompetensi, Membuka Peluang",
  description: "Synergy Indo Corpora — lembaga pelatihan kerja yang berfokus pada pengembangan kompetensi, kesiapan karier, dan masa depan tenaga kerja.",
  metadataBase: new URL("https://example.com"),
  robots: { index: false, follow: false }, // Aktifkan setelah domain & konten resmi diverifikasi.
  openGraph: { title: "Synergy Indo Corpora", description: "Membangun kompetensi. Membuka peluang." },
};

export const viewport: Viewport = { themeColor: "#090c12", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
