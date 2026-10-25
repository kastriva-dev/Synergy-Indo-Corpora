import { NextRequest, NextResponse } from "next/server";
import { checkRateLimit, rateLimitResponse } from "@/lib/admin/rate-limit";
import { sameOrigin } from "@/lib/admin/auth";
import { createCandidateUploadIntent, isRecruitmentReady, MAX_CV_BYTES } from "@/lib/recruitment/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origin tidak sah." }, { status: 403 });
  const blocked = rateLimitResponse(await checkRateLimit(request, "candidate-upload", 5, 900));
  if (blocked) return blocked;
  if (!isRecruitmentReady()) return NextResponse.json({ error: "Pendaftaran kandidat belum diaktifkan." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  try {
    const raw = await request.text();
    if (raw.length > 3000) return NextResponse.json({ error: "Permintaan terlalu besar." }, { status: 413 });
    const body = JSON.parse(raw) as { fileName?: unknown; fileSize?: unknown; contentType?: unknown };
    if (typeof body.fileName !== "string" || body.fileName.length > 180 ||
        typeof body.fileSize !== "number" || !Number.isInteger(body.fileSize) ||
        body.contentType !== "application/pdf" || !body.fileName.toLowerCase().endsWith(".pdf") ||
        body.fileSize < 1 || body.fileSize > MAX_CV_BYTES) {
      return NextResponse.json({ error: "CV wajib PDF dengan ukuran maksimal 5 MB." }, { status: 400 });
    }
    const intent = await createCandidateUploadIntent(body.fileName, body.fileSize);
    return NextResponse.json({ ok: true, uploadId: intent.id, signedUrl: intent.signedUrl, expiresAt: intent.expiresAt }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Tidak dapat menyiapkan unggahan CV. Coba lagi nanti." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
