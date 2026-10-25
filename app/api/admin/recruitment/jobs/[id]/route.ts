import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, sameOrigin } from "@/lib/admin/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/admin/rate-limit";
import { isRecruitmentReady, recruitmentDb } from "@/lib/recruitment/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Login admin diperlukan." }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origin tidak sah." }, { status: 403 });
  if (!isRecruitmentReady()) return NextResponse.json({ error: "Backend rekrutmen belum siap." }, { status: 503 });
  const blocked = rateLimitResponse(await checkRateLimit(request, "candidate-admin-write", 30, 60, session.email));
  if (blocked) return blocked;
  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "ID lowongan tidak valid." }, { status: 400 });
  try {
    const raw = await request.text();
    if (raw.length > 12000) return NextResponse.json({ error: "Permintaan terlalu besar." }, { status: 413 });
    const input = jobInput(JSON.parse(raw));
    if (!input) return NextResponse.json({ error: "Data lowongan tidak valid." }, { status: 400 });
    const updated = await recruitmentDb("/job_postings?id=eq." + encodeURIComponent(id) + "&select=id,slug,title,country,category,summary,description,requirements,image_url,application_deadline,is_published,created_at,updated_at", {
      method: "PATCH", headers: { Prefer: "return=representation" },
      body: JSON.stringify({ ...input, updated_by: session.email, updated_at: new Date().toISOString() }),
    });
    if (!Array.isArray(updated) || !updated.length) return NextResponse.json({ error: "Lowongan tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ok: true, job: updated[0] }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Lowongan belum dapat diperbarui." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
