import { isApprovedMediaUrl } from "@/lib/media-url";
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, sameOrigin } from "@/lib/admin/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/admin/rate-limit";
import { isFirebaseConfigured } from "@/lib/firebase/server";
import { readCmsSnapshot, saveCmsItem, saveCmsSite } from "@/lib/firebase/cms";
import { fallbackContent } from "@/lib/content";
import { readRequestBodyLimited, RequestBodyTooLargeError } from "@/lib/http/read-request-body-limited";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const allowedSiteKeys = new Set([
  "hero_eyebrow", "hero_title_1", "hero_title_2", "hero_title_accent", "hero_description",
  "about_description", "contact_whatsapp", "contact_email", "contact_address",
]);
const isPlain = (x: unknown): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x);
const validImage = (x: unknown): x is string => x === "" || isApprovedMediaUrl(x);

function validate(body: unknown): string | null {
  if (!isPlain(body) || typeof body.action !== "string" || !isPlain(body.data)) return "Permintaan tidak valid.";
  const data = body.data;
  if (body.action === "update_site") {
    if (!Object.keys(data).length || Object.keys(data).some(key => !allowedSiteKeys.has(key) || typeof data[key] !== "string" || (data[key] as string).length > 600)) return "Kolom profil tidak sah.";
    return null;
  }
  if (body.action !== "upsert_program" && body.action !== "upsert_gallery") return "Aksi tidak diperbolehkan.";
  if (typeof data.id !== "string" || !/^[a-zA-Z0-9-]{3,80}$/.test(data.id) ||
      typeof data.title !== "string" || !data.title.trim() || data.title.length > 160 ||
      typeof data.category !== "string" || data.category.length > 100 ||
      typeof data.published !== "boolean" ||
      !Number.isInteger(Number(data.order)) || Number(data.order) < 0 || Number(data.order) > 9999 ||
      !validImage(data.image_url)) return "Data program atau galeri tidak valid.";
  if (data.published && !data.image_url) return "Unggah foto sebelum mempublikasikan konten.";
  const validDuration = typeof data.duration === "string"
    ? data.duration.length <= 100
    : typeof data.duration === "number" && Number.isFinite(data.duration) && String(data.duration).length <= 100;
  if (body.action === "upsert_program" && (typeof data.description !== "string" || data.description.length > 600 || !validDuration)) {
    return "Deskripsi program tidak valid.";
  }
  return null;
}

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Login diperlukan." }, { status: 401 });
  if (!isFirebaseConfigured()) return NextResponse.json({ error: "Firebase CMS belum dikonfigurasi." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  const blocked = rateLimitResponse(await checkRateLimit(request, "content-read", 60, 60, session.email));
  if (blocked) return blocked;
  try {
    const snapshot = await readCmsSnapshot(true);
    return NextResponse.json({
      ok: true,
      data: { site: { ...fallbackContent.site, ...snapshot.site }, programs: snapshot.programs, gallery: snapshot.gallery },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Data CMS Firebase tidak dapat dibaca." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Anda harus login sebagai admin." }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origin tidak sah." }, { status: 403 });
  if (!isFirebaseConfigured()) return NextResponse.json({ error: "Firebase CMS belum dikonfigurasi." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  const blocked = rateLimitResponse(await checkRateLimit(request, "content-write", 20, 60, session.email));
  if (blocked) return blocked;
  try {
    const raw = await readRequestBodyLimited(request, 35000);
    const body: unknown = JSON.parse(raw.toString("utf8"));
    const validationError = validate(body);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
    const payload = body as Record<string, unknown>;
    const data = payload.data as Record<string, unknown>;
    if (payload.action === "update_site") {
      await saveCmsSite(data, session.email);
      return NextResponse.json({ ok: true, message: "Profil tersimpan di Firebase." }, { headers: { "Cache-Control": "no-store" } });
    }
    if (payload.action === "upsert_program" || payload.action === "upsert_gallery") {
      const item = {
        ...data,
        order: Number(data.order),
        ...(payload.action === "upsert_program" ? { duration: String(data.duration) } : {}),
      };
      const id = await saveCmsItem(payload.action === "upsert_program" ? "programs" : "gallery", item, session.email);
      return NextResponse.json({ ok: true, id, message: "Konten tersimpan di Firebase." }, { headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ error: "Aksi tidak diperbolehkan." }, { status: 400 });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Data terlalu besar." }, { status: 413, headers: { "Cache-Control": "no-store" } });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Format permintaan tidak valid." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ error: "Gagal menyimpan perubahan ke Firebase. Periksa konfigurasi dan coba lagi." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
