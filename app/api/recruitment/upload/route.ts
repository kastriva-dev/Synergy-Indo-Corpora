import { NextRequest, NextResponse } from "next/server";
import { sameOrigin } from "@/lib/admin/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/admin/rate-limit";
import { createCandidateUploadIntent, isRecruitmentReady, MAX_CV_BYTES } from "@/lib/recruitment/store";
import { readRequestBodyLimited, RequestBodyTooLargeError } from "@/lib/http/read-request-body-limited";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origin tidak sah." }, { status: 403 });
  const blocked = rateLimitResponse(await checkRateLimit(request, "candidate-upload", 5, 900));
  if (blocked) return blocked;
  if (!isRecruitmentReady()) return NextResponse.json({ error: "Pendaftaran kandidat belum diaktifkan." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  try {
    const raw = await readRequestBodyLimited(request, 3000);
    const parsed: unknown = JSON.parse(raw.toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return NextResponse.json({ error: "Permintaan tidak valid." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    const body = parsed as { fileName?: unknown; fileSize?: unknown; contentType?: unknown };
    if (typeof body.fileName !== "string" || body.fileName.length > 180 ||
        typeof body.fileSize !== "number" || !Number.isInteger(body.fileSize) ||
        body.contentType !== "application/pdf" || !body.fileName.toLowerCase().endsWith(".pdf") ||
        body.fileSize < 1 || body.fileSize > MAX_CV_BYTES) {
      return NextResponse.json({ error: "CV wajib PDF dengan ukuran maksimal 3 MiB." }, { status: 400 });
    }
    const intent = await createCandidateUploadIntent(body.fileName, body.fileSize);
    return NextResponse.json({ ok: true, uploadId: intent.id, expiresAt: intent.expiresAt }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Permintaan terlalu besar." }, { status: 413, headers: { "Cache-Control": "no-store" } });
    }
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Format permintaan tidak valid." }, { status: 400, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ error: "Tidak dapat menyiapkan unggahan CV. Coba lagi nanti." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
