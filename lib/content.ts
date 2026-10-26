import { isApprovedMediaUrl } from "@/lib/media-url";
export type Program = {
  id: string;
  title: string;
  category: string;
  description: string;
  duration: string;
  image_url: string;
  published: boolean;
  order: number;
};

export type GalleryItem = {
  id: string;
  title: string;
  category: string;
  image_url: string;
  published: boolean;
  order: number;
};

export type JobListing = {
  id: string;
  title: string;
  country: string;
  category: string;
  summary: string;
  image_url: string;
  published: boolean;
  order: number;
};

export type SiteContent = { hero_eyebrow: string; hero_title_1: string; hero_title_2: string; hero_title_accent: string; hero_description: string; about_description: string; contact_whatsapp: string; contact_email: string; contact_address: string };

export type PublicContent = { site: SiteContent; programs: Program[]; gallery: GalleryItem[]; jobs: JobListing[]; source: "demo" | "gas" };

// Placeholder demo: bukan klaim faktual tentang program, kerja sama, hasil, atau izin LPK.
export const fallbackContent: PublicContent = {
  source: "demo",
  site: {
    hero_eyebrow: "MEMBUKA PELUANG KARIER INTERNASIONAL",
    hero_title_1: "KOMPETENSI",
    hero_title_2: "UNTUK MASA",
    hero_title_accent: "DEPAN.",
    hero_description: "Ruang tumbuh bagi individu yang ingin mengasah keterampilan, membangun kepercayaan diri, dan mempersiapkan langkah berikutnya dalam dunia kerja.",
    about_description: "Sinergi Global berfokus pada kualitas kandidat dan kesiapan tenaga kerja untuk peluang internasional. Profil resmi, cakupan layanan, serta legalitas akan dikonfirmasi perusahaan.",
    contact_whatsapp: "",
    contact_email: "",
    contact_address: "Informasi alamat akan diperbarui",
  },
  programs: [
    { id: "program-01", title: "Pelatihan Keterampilan", category: "PENGEMBANGAN", description: "Ruang pembelajaran terstruktur untuk membangun kemampuan praktis sesuai kebutuhan peserta.", duration: "Detail menyusul", image_url: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1050&q=80", published: true, order: 1 },
    { id: "program-02", title: "Persiapan Dunia Kerja", category: "KESIAPAN KARIER", description: "Mendorong kesiapan peserta melalui pembelajaran, pembiasaan, dan pendekatan profesional.", duration: "Detail menyusul", image_url: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1050&q=80", published: true, order: 2 },
    { id: "program-03", title: "Penguatan Kompetensi", category: "PEMBELAJARAN", description: "Mengembangkan kualitas individu melalui proses belajar yang terarah dan berkelanjutan.", duration: "Detail menyusul", image_url: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=1050&q=80", published: true, order: 3 },
    { id: "program-04", title: "Pengembangan Profesional", category: "KARIER", description: "Pendekatan pembelajaran yang menempatkan keterampilan dan kesiapan kerja sebagai prioritas.", duration: "Detail menyusul", image_url: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1050&q=80", published: true, order: 4 },
  ],
  gallery: [
    { id: "gallery-01", title: "Proses Pembelajaran", category: "KEGIATAN", image_url: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80", published: true, order: 1 },
    { id: "gallery-02", title: "Kolaborasi & Diskusi", category: "KOLABORASI", image_url: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80", published: true, order: 2 },
    { id: "gallery-03", title: "Pengembangan Keterampilan", category: "PELATIHAN", image_url: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=80", published: true, order: 3 },
  ],
  jobs: [
    { id: "job-demo-01", title: "Welder / Juru Las", country: "Poland", category: "Welding", summary: "Contoh posisi untuk tenaga kerja terampil di bidang pengelasan dan fabrikasi. Bukan lowongan aktif.", image_url: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1000&q=82", published: true, order: 1 },
    { id: "job-demo-02", title: "Warehouse Operator", country: "Poland", category: "Warehouse", summary: "Contoh peran untuk operasional gudang, penataan barang, dan proses logistik. Bukan lowongan aktif.", image_url: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1000&q=82", published: true, order: 2 },
    { id: "job-demo-03", title: "Electrician", country: "Germany", category: "Electrical", summary: "Contoh posisi teknis untuk instalasi dan pemeliharaan kelistrikan. Bukan lowongan aktif.", image_url: "https://images.unsplash.com/photo-1621905251189-08b45d6a269e?auto=format&fit=crop&w=1000&q=82", published: true, order: 3 },
    { id: "job-demo-04", title: "Production Operator", country: "Czech Republic", category: "Manufacturing", summary: "Contoh peran untuk kegiatan produksi dan pengoperasian proses manufaktur. Bukan lowongan aktif.", image_url: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=1000&q=82", published: true, order: 4 },
    { id: "job-demo-05", title: "Hospitality Crew", country: "Netherlands", category: "Hospitality", summary: "Contoh peran layanan dan operasional hospitality dengan orientasi pelayanan. Bukan lowongan aktif.", image_url: "https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=1000&q=82", published: true, order: 5 },
    { id: "job-demo-06", title: "Construction Worker", country: "Germany", category: "Construction", summary: "Contoh posisi pendukung proyek konstruksi dan pekerjaan lapangan. Bukan lowongan aktif.", image_url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1000&q=82", published: true, order: 6 }
  ],
};

function safeString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim().length > 0 ? value.slice(0, 600) : fallback;
}
function isImageUrl(value: unknown): value is string {
  return isApprovedMediaUrl(value);
}
function coerceItems<T extends Program | GalleryItem>(items: unknown, fallbacks: T[]): T[] {
  if (!Array.isArray(items)) return fallbacks;
  return items.slice(0, 24).filter((item) => item && typeof item === "object" && item.published === true).map((item: Record<string, unknown>, index) => ({
    ...item,
    id: safeString(item.id, `item-${index}`),
    title: safeString(item.title, "Konten Sinergi Global"),
    category: safeString(item.category, "SINERGI GLOBAL"),
    image_url: isImageUrl(item.image_url) ? item.image_url : "",
    order: Number.isFinite(Number(item.order)) ? Number(item.order) : index,
    ...(typeof item.description !== "undefined" ? { description: safeString(item.description, "") } : {}),
    ...(typeof item.duration !== "undefined" ? { duration: safeString(item.duration, "") } : {}),
  } as T)).sort((a, b) => a.order - b.order);
}

function coerceJobs(items: unknown): JobListing[] {
  if (!Array.isArray(items)) return [];
  return items.slice(0, 24)
    .filter((item) => item && typeof item === "object" && item.published === true)
    .map((item: Record<string, unknown>, index) => ({
      id: safeString(item.id, `job-${index}`),
      title: safeString(item.title, "Posisi"),
      country: safeString(item.country, "Negara belum ditentukan"),
      category: safeString(item.category, "Bidang umum"),
      summary: typeof item.summary === "string" ? item.summary.slice(0, 600) : "",
      image_url: isImageUrl(item.image_url) ? item.image_url : "",
      published: true,
      order: Number.isFinite(Number(item.order)) ? Number(item.order) : index,
    }))
    .sort((a, b) => a.order - b.order);
}

function containsLegacyBrandContent(value: unknown): boolean {
  const raw = value && typeof value === "object" ? value as Record<string, unknown> : {};
  // Ignore the legacy programs tab because it is not rendered on the new homepage.
  // Still fail closed if visible company identity, jobs, or gallery contain old-brand content.
  const serialized = (JSON.stringify({ site: raw.site, jobs: raw.jobs, gallery: raw.gallery }) || "").toLowerCase();
  return /synergy indo corpora|lembaga pelatihan kerja|\blpk\b/.test(serialized);
}

export async function getPublicContent(): Promise<PublicContent> {
  const url = process.env.GAS_WEB_APP_URL?.trim();
  if (!url) return fallbackContent;
  try {
    const target = new URL(url);
    if (target.protocol !== "https:" || target.hostname !== "script.google.com" || !target.pathname.endsWith("/exec")) return fallbackContent;
    target.searchParams.set("resource", "public");
    const response = await fetch(target.toString(), {
      next: { revalidate: 300 },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error(`GAS HTTP ${response.status}`);
    const body = await response.json();
    if (body?.ok !== true || !body.data || typeof body.data !== "object") throw new Error("Response format invalid");
    const raw = body.data as Record<string, unknown>;
    if (containsLegacyBrandContent(raw)) {
      console.warn("Sinergi Global: GAS masih berisi konten merek lama; memakai konten pratinjau aman.");
      return fallbackContent;
    }
    const siteRaw = raw.site && typeof raw.site === "object" ? raw.site as Record<string, unknown> : {};
    const site = Object.fromEntries(Object.entries(fallbackContent.site).map(([key, value]) => [key, safeString(siteRaw[key], value)])) as SiteContent;
    return {
      source: "gas",
      site,
      programs: coerceItems(raw.programs, fallbackContent.programs),
      gallery: Array.isArray(raw.gallery) ? coerceItems<GalleryItem>(raw.gallery, []) : [],
      // A connected CMS with no published jobs must stay empty, never fall back to demo jobs.
      jobs: coerceJobs(raw.jobs),
    };
  } catch (error) {
    console.warn("Sinergi Global: GAS tidak tersedia, menampilkan konten pratinjau aman:", error instanceof Error ? error.message : "unknown error");
    return fallbackContent;
  }
}
