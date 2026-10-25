import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/admin/rate-limit";
import { getCandidateApplication, getCandidateCvBytes, isRecruitmentReady, writeCandidateAudit } from "@/lib/recruitment/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function GET(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Login admin diperlukan." }, { status: 401 });
  if (!isRecruitmentReady()) return NextResponse.json({ error: "Backend rekrutmen belum siap." }, { status: 503 });
  const blocked = rateLimitResponse(await checkRateLimit(request, "candidate-cv-download", 20, 600, session.email));
  if (blocked) return blocked;
  const { id } = await context.params;
  if (!UUID.test(id)) return NextResponse.json({ error: "ID lamaran tidak valid." }, { status: 400 });
  try {
    const application = await getCandidateApplication(id);
    if (!application || application.status === "deleted" || !application.cv_storage_path) return NextResponse.json({ error: "CV tidak ditemukan." }, { status: 404 });
    const bytes = await getCandidateCvBytes(application.cv_storage_path);
    await writeCandidateAudit({ actorType: "admin", actorEmail: session.email, action: "cv_downloaded", applicationId: id, details: { bytes: bytes.length } });
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": "attachment; filename=\"CV-" + id.slice(0, 8) + ".pdf\"",
        "Content-Length": String(bytes.length),
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "CV tidak dapat diunduh dengan aman." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
