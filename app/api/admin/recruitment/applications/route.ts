import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, sameOrigin } from "@/lib/admin/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/admin/rate-limit";
import { isRecruitmentReady, recruitmentDb } from "@/lib/recruitment/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Login admin diperlukan." }, { status: 401 });
  if (!isRecruitmentReady()) return NextResponse.json({ error: "Backend rekrutmen belum siap." }, { status: 503 });
  const blocked = rateLimitResponse(await checkRateLimit(request, "candidate-admin-read", 60, 60, session.email));
  if (blocked) return blocked;
  const params = new URL(request.url).searchParams;
  const limitValue = Number(params.get("limit") || "50");
  const offsetValue = Number(params.get("offset") || "0");
  const limit = Number.isInteger(limitValue) ? Math.min(100, Math.max(1, limitValue)) : 50;
  const offset = Number.isInteger(offsetValue) ? Math.max(0, Math.min(10000, offsetValue)) : 0;
  const status = params.get("status");
  const query = new URLSearchParams({
    select: "id,full_name,phone,email,target_country,job_id,job_title_snapshot,status,cv_original_name,privacy_notice_version,consent_at,created_at,updated_at,retention_due_at,reviewed_by,reviewed_at,deleted_at",
    order: "created_at.desc", limit: String(limit), offset: String(offset),
  });
  if (status && ["received", "reviewing", "shortlisted", "rejected", "hired", "deleted"].includes(status)) query.set("status", "eq." + status);
  try {
    const applications = await recruitmentDb("/candidate_applications?" + query.toString());
    return NextResponse.json({ applications }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Data kandidat tidak dapat dibaca." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Login admin diperlukan." }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origin tidak sah." }, { status: 403 });
  return NextResponse.json({ error: "Metode tidak didukung." }, { status: 405, headers: { Allow: "GET" } });
}
