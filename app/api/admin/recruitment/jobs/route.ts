import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, sameOrigin } from "@/lib/admin/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/admin/rate-limit";
import { createRecruitmentJob, isRecruitmentBackendConfigured, listAdminJobs } from "@/lib/recruitment/store";
import { readRequestBodyLimited, RequestBodyTooLargeError } from "@/lib/http/read-request-body-limited";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function jobInput(body: unknown): Record<string, unknown> | null {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const value = body as Record<string, unknown>;
  const title = typeof value.title === "string" ? value.title.trim() : "";
  const country = typeof value.country === "string" ? value.country.trim() : "";
  const category = typeof value.category === "string" ? value.category.trim() : "";
  const summary = typeof value.summary === "string" ? value.summary.trim() : "";
  const description = typeof value.description === "string" ? value.description.trim() : "";
  const requirements = typeof value.requirements === "string" ? value.requirements.trim() : "";
  const deadline = value.application_deadline === null || value.application_deadline === "" ? null : value.application_deadline;
  if (!title || title.length > 160 || !country || country.length > 100 || !category || category.length > 80 ||
      !summary || summary.length > 400 || description.length > 4000 || requirements.length > 4000 ||
      (deadline !== null && (typeof deadline !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(deadline))) ||
      typeof value.is_published !== "boolean") return null;
  if (value.is_published && (description.length < 20 || requirements.length < 10)) return null;
  if (value.is_published && deadline && deadline < new Date().toISOString().slice(0, 10)) return null;
  return { title, country, category, summary, description, requirements, application_deadline: deadline, is_published: value.is_published };
}
function slugify(value: string): string {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase()
    .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "lowongan";
}

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Login admin diperlukan." }, { status: 401 });
  if (!isRecruitmentBackendConfigured()) return NextResponse.json({ error: "Backend rekrutmen belum siap." }, { status: 503 });
  const blocked = rateLimitResponse(await checkRateLimit(request, "candidate-admin-read", 60, 60, session.email));
  if (blocked) return blocked;
  try {
    const jobs = await listAdminJobs();
    return NextResponse.json({ jobs }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Lowongan tidak dapat dibaca." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Login admin diperlukan." }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origin tidak sah." }, { status: 403 });
  if (!isRecruitmentBackendConfigured()) return NextResponse.json({ error: "Backend rekrutmen belum siap." }, { status: 503 });
  const blocked = rateLimitResponse(await checkRateLimit(request, "candidate-admin-write", 30, 60, session.email));
  if (blocked) return blocked;
  try {
    const raw = await readRequestBodyLimited(request, 12000);
    const input = jobInput(JSON.parse(raw.toString("utf8")));
    if (!input) return NextResponse.json({ error: "Lengkapi data lowongan. Posisi publik wajib memiliki deskripsi dan persyaratan." }, { status: 400 });
    const now = new Date().toISOString();
    const job = await createRecruitmentJob({
      id: randomUUID(), slug: slugify(String(input.title)) + "-" + randomUUID().slice(0, 8), ...input,
      image_url: null, created_by: session.email, updated_by: session.email, created_at: now, updated_at: now,
    });
    return NextResponse.json({ ok: true, job }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Permintaan terlalu besar." }, { status: 413, headers: { "Cache-Control": "no-store" } });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Format permintaan tidak valid." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ error: "Lowongan belum dapat disimpan." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
