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

export type SiteContent = { hero_eyebrow: string; hero_title_1: string; hero_title_2: string; hero_title_accent: string; hero_description: string; about_description: string; contact_whatsapp: string; contact_email: string; contact_address: string };

export type PublicContent = { site: SiteContent; programs: Program[]; gallery: GalleryItem[]; source: "demo" | "gas" };

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

function containsLegacyBrandContent(value: unknown): boolean {
  const serialized = (JSON.stringify(value) || "").toLowerCase();
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
    return { source: "gas", site, programs: coerceItems(raw.programs, fallbackContent.programs), gallery: Array.isArray(raw.gallery) ? coerceItems<GalleryItem>(raw.gallery, []) : [] };
  } catch (error) {
    console.warn("Sinergi Global: GAS tidak tersedia, menampilkan konten pratinjau aman:", error instanceof Error ? error.message : "unknown error");
    return fallbackContent;
  }
}
