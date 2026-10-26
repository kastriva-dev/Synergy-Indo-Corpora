import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sinergi Global | Peluang Karier Internasional",
  description: "Sinergi Global membantu calon pekerja mengenali informasi peluang karier internasional, bidang kerja, dan persiapan kandidat secara terarah.",
  metadataBase: new URL("https://sinergiglobal.co.id"),
  robots: { index: false, follow: false }, // Aktifkan setelah domain & konten resmi diverifikasi.
  openGraph: { title: "Sinergi Global", description: "Keterampilan Anda, peluang dunia." },
};

export const viewport: Viewport = { themeColor: "#071a29", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="id"><body>{children}</body></html>;
}
