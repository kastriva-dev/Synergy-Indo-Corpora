import { isApprovedMediaUrl } from "@/lib/media-url";
import { isFirebaseConfigured } from "@/lib/firebase/server";
import { readCmsSnapshot } from "@/lib/firebase/cms";
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

export type PublicContent = { site: SiteContent; programs: Program[]; gallery: GalleryItem[]; source: "demo" | "gas" | "firebase" };

// Placeholder demo: kategori, foto, dan narasi di bawah bukan lowongan atau dokumentasi resmi perusahaan.
export const fallbackContent: PublicContent = {
  source: "demo",
  site: {
    hero_eyebrow: "MEMBUKA PELUANG KARIER INTERNASIONAL",
    hero_title_1: "KETERAMPILAN",
    hero_title_2: "ANDA, PELUANG",
    hero_title_accent: "DUNIA.",
    hero_description: "Temukan arah karier global dengan informasi yang jelas, persiapan yang terarah, dan pendampingan sesuai proses resmi perusahaan.",
    about_description: "Sinergi Global berfokus pada kualitas kandidat dan kesiapan tenaga kerja untuk peluang internasional. Profil resmi, cakupan layanan, serta legalitas akan dikonfirmasi perusahaan.",
    contact_whatsapp: "",
    contact_email: "",
    contact_address: "Alamat resmi perusahaan akan diperbarui",
  },
  programs: [
    { id: "program-hospitality", title: "Hospitality", category: "Hospitality", description: "Hotel, layanan, dan operasional hospitality. Detail peluang mengikuti lowongan resmi yang dipublikasikan.", duration: "Informasi posisi menyusul", image_url: "https://images.unsplash.com/photo-1556761175-b413da4baf72?auto=format&fit=crop&w=1050&q=80", published: true, order: 1 },
    { id: "program-manufacturing", title: "Manufacturing", category: "Manufacturing", description: "Produksi, perakitan, dan proses manufaktur. Detail peluang mengikuti lowongan resmi yang dipublikasikan.", duration: "Informasi posisi menyusul", image_url: "https://images.unsplash.com/photo-1581092160562-40aa08e78837?auto=format&fit=crop&w=1050&q=80", published: true, order: 2 },
    { id: "program-electrical", title: "Electrical", category: "Electrical", description: "Instalasi dan pekerjaan teknis kelistrikan. Detail peluang mengikuti lowongan resmi yang dipublikasikan.", duration: "Informasi posisi menyusul", image_url: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1050&q=80", published: true, order: 3 },
    { id: "program-warehouse", title: "Warehouse", category: "Warehouse", description: "Gudang, distribusi, dan dukungan logistik. Detail peluang mengikuti lowongan resmi yang dipublikasikan.", duration: "Informasi posisi menyusul", image_url: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1050&q=80", published: true, order: 4 },
    { id: "program-construction", title: "Construction", category: "Construction", description: "Pekerjaan lapangan dan dukungan konstruksi. Detail peluang mengikuti lowongan resmi yang dipublikasikan.", duration: "Informasi posisi menyusul", image_url: "https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1050&q=80", published: true, order: 5 },
    { id: "program-welding", title: "Welding", category: "Welding", description: "Pengelasan, fabrikasi, dan pekerjaan logam. Detail peluang mengikuti lowongan resmi yang dipublikasikan.", duration: "Informasi posisi menyusul", image_url: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1050&q=80", published: true, order: 6 },
  ],
  gallery: [
    { id: "gallery-01", title: "Kolaborasi dan Diskusi", category: "KOLABORASI", image_url: "https://images.unsplash.com/photo-1523240795612-9a054b0db644?auto=format&fit=crop&w=1200&q=80", published: true, order: 1 },
    { id: "gallery-02", title: "Persiapan Kandidat", category: "PERSIAPAN", image_url: "https://images.unsplash.com/photo-1531482615713-2afd69097998?auto=format&fit=crop&w=1200&q=80", published: true, order: 2 },
    { id: "gallery-03", title: "Lingkungan Kerja Profesional", category: "LINGKUNGAN KERJA", image_url: "https://images.unsplash.com/photo-1504917595217-d4dc5ebe6122?auto=format&fit=crop&w=1200&q=80", published: true, order: 3 },
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
  // Meeting preview only: GAS is a read-only CMS source and takes precedence while configured.
  const gasUrl = process.env.GAS_WEB_APP_URL?.trim();
  if (gasUrl) {
    try {
      const target = new URL(gasUrl);
      if (target.protocol !== "https:" || target.hostname !== "script.google.com" || !target.pathname.endsWith("/exec")) {
        throw new Error("GAS_WEB_APP_URL harus berupa URL Google Apps Script HTTPS yang berakhiran /exec");
      }
      target.searchParams.set("resource", "public");
      const response = await fetch(target.toString(), {
        next: { revalidate: 300 },
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error(`GAS HTTP ${response.status}`);
      const body: unknown = await response.json();
      if (!body || typeof body !== "object") throw new Error("Respons GAS tidak valid");
      const envelope = body as { ok?: unknown; data?: unknown };
      if (envelope.ok !== true || !envelope.data || typeof envelope.data !== "object") {
        throw new Error("Format respons GAS tidak valid");
      }
      const raw = envelope.data as Record<string, unknown>;

      // Never show old LPK/Synergy Indo Corpora content under the new Sinergi Global brand.
      if (containsLegacyBrandContent(raw)) {
        console.warn("Sinergi Global: GAS masih berisi konten merek lama; memakai konten pratinjau yang aman.");
        return fallbackContent;
      }

      const siteRaw = raw.site && typeof raw.site === "object" ? raw.site as Record<string, unknown> : {};
      const site = Object.fromEntries(
        Object.entries(fallbackContent.site).map(([key, value]) => [key, safeString(siteRaw[key], value)])
      ) as SiteContent;
      return {
        source: "gas",
        site,
        programs: coerceItems(raw.programs, fallbackContent.programs),
        gallery: coerceItems(raw.gallery, fallbackContent.gallery),
      };
    } catch (error) {
      console.warn("Sinergi Global: GAS tidak tersedia; memakai konten pratinjau aman:",
        error instanceof Error ? error.message : "unknown error");
      return fallbackContent;
    }
  }

  // Firebase remains the target CMS after the client-owned project is ready.
  if (!isFirebaseConfigured()) return fallbackContent;
  try {
    const raw = await readCmsSnapshot(false);
    const site = Object.fromEntries(
      Object.entries(fallbackContent.site).map(([key, value]) => [key, safeString(raw.site[key], value)])
    ) as SiteContent;
    return {
      source: "firebase",
      site,
      programs: coerceItems(raw.programs, fallbackContent.programs),
      gallery: coerceItems(raw.gallery, fallbackContent.gallery),
    };
  } catch (error) {
    console.warn("Sinergi Global: Firebase CMS unavailable; using safe demo fallback:",
      error instanceof Error ? error.message : "unknown error");
    return fallbackContent;
  }
}
