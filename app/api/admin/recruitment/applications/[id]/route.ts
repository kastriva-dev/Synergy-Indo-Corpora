import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, sameOrigin } from "@/lib/admin/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/admin/rate-limit";
import {
  anonymizeCandidateApplication, getCandidateApplication, isRecruitmentBackendConfigured,
  updateCandidateApplicationStatus,
} from "@/lib/recruitment/store";
import { readRequestBodyLimited, RequestBodyTooLargeError } from "@/lib/http/read-request-body-limited";

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
    const raw = await readRequestBodyLimited(request, 2000);
    const parsed: unknown = JSON.parse(raw.toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    const body = parsed as { status?: unknown };
    if (typeof body.status !== "string" || !ALLOWED_STATUSES.has(body.status)) return NextResponse.json({ error: "Status lamaran tidak valid." }, { status: 400 });
    const application = await updateCandidateApplicationStatus(id, body.status, session.email);
    if (!application) return NextResponse.json({ error: "Lamaran tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ok: true, application }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Permintaan terlalu besar." }, { status: 413, headers: { "Cache-Control": "no-store" } });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Format permintaan tidak valid." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
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
