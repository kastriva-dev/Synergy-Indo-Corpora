import { isApprovedMediaUrl } from "@/lib/media-url";
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, sameOrigin } from "@/lib/admin/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/admin/rate-limit";

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
  if (body.action !== "upsert_program" && body.action !== "upsert_gallery" && body.action !== "upsert_job") return "Aksi tidak diperbolehkan.";
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
  if (body.action === "upsert_job" &&
      (typeof data.country !== "string" || !data.country.trim() || data.country.length > 100 ||
       typeof data.category !== "string" || !data.category.trim() || data.category.length > 100 ||
       typeof data.summary !== "string" || !data.summary.trim() || data.summary.length > 600)) {
    return "Negara, bidang, atau ringkasan lowongan tidak valid.";
  }
  return null;
}

async function callAdminGas(payload: Record<string, unknown>) {
  const url = process.env.GAS_ADMIN_WEB_APP_URL?.trim();
  const secret = process.env.GAS_ADMIN_SECRET?.trim();
  if (!url || !secret || secret.length < 32) throw new Error("Backend admin GAS belum dikonfigurasi.");
  const parsedUrl = new URL(url);
  if (parsedUrl.protocol !== "https:" || parsedUrl.hostname !== "script.google.com" || !parsedUrl.pathname.endsWith("/exec")) throw new Error("URL admin GAS tidak valid.");
  const upstream = await fetch(parsedUrl.toString(), {
    method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ ...payload, secret }), signal: AbortSignal.timeout(15000), cache: "no-store",
  });
  if (!upstream.ok) throw new Error("GAS sedang tidak tersedia.");
  const result = await upstream.json() as { ok?: boolean; error?: string; id?: string; data?: unknown };
  if (!result.ok) throw new Error(result.error || "Perubahan ditolak GAS.");
  return result;
}

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Login diperlukan." }, { status: 401 });

  const blocked = rateLimitResponse(await checkRateLimit(request, "content-read", 60, 60, session.email));
  if (blocked) return blocked;

  try {
    const result = await callAdminGas({ action: "read_content" });
    return NextResponse.json({ ok: true, data: result.data }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Tidak bisa membaca data admin GAS." }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Anda harus login sebagai admin." }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origin tidak sah." }, { status: 403 });

  const blocked = rateLimitResponse(await checkRateLimit(request, "content-write", 20, 60, session.email));
  if (blocked) return blocked;

  try {
    const raw = await request.text();
    if (raw.length > 35000) return NextResponse.json({ error: "Data terlalu besar." }, { status: 413 });
    const body: unknown = JSON.parse(raw);
    const validationError = validate(body);
    if (validationError) return NextResponse.json({ error: validationError }, { status: 400 });
    const payload = body as Record<string, unknown>;
    if ((payload.action === "upsert_program" || payload.action === "upsert_gallery" || payload.action === "upsert_job") && isPlain(payload.data)) {
      const item = payload.data;
      payload.data = {
        ...item,
        order: Number(item.order),
        ...(payload.action === "upsert_program" ? { duration: String(item.duration) } : {}),
      };
    }
    const result = await callAdminGas(payload);
    return NextResponse.json({ ok: true, id: result.id ?? null, message: "Perubahan tersimpan. Halaman publik diperbarui setelah cache berakhir." }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Gagal menyimpan ke GAS. Periksa pengaturan admin dan koneksi, lalu coba lagi." }, { status: 502 });
  }
}
