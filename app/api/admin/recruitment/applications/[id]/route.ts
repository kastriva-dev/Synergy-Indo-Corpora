import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, sameOrigin } from "@/lib/admin/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/admin/rate-limit";
import {
  anonymizeCandidateApplication, getCandidateApplication, isRecruitmentBackendConfigured,
  updateCandidateApplicationStatus,
} from "@/lib/recruitment/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const ALLOWED_STATUSES = new Set(["received", "reviewing", "shortlisted", "rejected", "hired"]);

export async function PATCH(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Login admin diperlukan." }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origin tidak sah." }, { status: 403 });
  if (!isRecruitmentBackendConfigured()) return NextResponse.json({ error: "Backend rekrutmen belum siap." }, { status: 503 });
  const blocked = rateLimitResponse(await checkRateLimit(request, "candidate-admin-write", 30, 60, session.email));
  if (blocked) return blocked;
  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "ID lamaran tidak valid." }, { status: 400 });
  try {
    const raw = await request.text();
    if (raw.length > 2000) return NextResponse.json({ error: "Permintaan terlalu besar." }, { status: 413 });
    const body = JSON.parse(raw) as { status?: unknown };
    if (typeof body.status !== "string" || !ALLOWED_STATUSES.has(body.status)) return NextResponse.json({ error: "Status lamaran tidak valid." }, { status: 400 });
    const application = await updateCandidateApplicationStatus(id, body.status, session.email);
    if (!application) return NextResponse.json({ error: "Lamaran tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ok: true, application }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Status lamaran tidak dapat diperbarui." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export async function DELETE(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Login admin diperlukan." }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origin tidak sah." }, { status: 403 });
  if (!isRecruitmentBackendConfigured()) return NextResponse.json({ error: "Backend rekrutmen belum siap." }, { status: 503 });
  const blocked = rateLimitResponse(await checkRateLimit(request, "candidate-admin-delete", 10, 600, session.email));
  if (blocked) return blocked;
  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "ID lamaran tidak valid." }, { status: 400 });
  try {
    const application = await getCandidateApplication(id);
    if (!application || application.status === "deleted") return NextResponse.json({ error: "Lamaran tidak ditemukan." }, { status: 404 });
    await anonymizeCandidateApplication(id, session.email, "admin_request");
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Penghapusan data belum selesai. Periksa storage dan coba lagi." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
