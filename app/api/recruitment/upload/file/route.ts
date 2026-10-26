import { NextRequest, NextResponse } from "next/server";
import { sameOrigin } from "@/lib/admin/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/admin/rate-limit";
import { isRecruitmentReady, MAX_CV_BYTES, uploadCandidateCv } from "@/lib/recruitment/store";
import {
  readRequestBodyLimited,
  RequestBodyTooLargeError,
} from "@/lib/http/read-request-body-limited";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origin tidak sah." }, { status: 403 });
  const blocked = rateLimitResponse(await checkRateLimit(request, "candidate-upload-file", 5, 900));
  if (blocked) return blocked;
  if (!isRecruitmentReady()) return NextResponse.json({ error: "Pendaftaran kandidat belum diaktifkan." }, { status: 503, headers: { "Cache-Control": "no-store" } });

  const uploadId = request.headers.get("x-candidate-upload-id") || "";
  if (!/^[0-9a-f-]{36}$/i.test(uploadId)) return NextResponse.json({ error: "Sesi unggah tidak valid." }, { status: 400 });
  if ((request.headers.get("content-type") || "").split(";")[0].trim().toLowerCase() !== "application/pdf") {
    return NextResponse.json({ error: "CV wajib berformat PDF." }, { status: 415 });
  }
  const contentLength = Number(request.headers.get("content-length") || "0");
  if (contentLength > MAX_CV_BYTES) return NextResponse.json({ error: "Ukuran CV maksimal 3 MiB." }, { status: 413 });

  try {
    const bytes = await readRequestBodyLimited(request, MAX_CV_BYTES);
    if (bytes.length < 8 || bytes.length > MAX_CV_BYTES || bytes.subarray(0, 5).toString("ascii") !== "%PDF-") {
      return NextResponse.json({ error: "Isi CV tidak valid atau ukurannya melebihi 3 MiB." }, { status: 400 });
    }
    await uploadCandidateCv(uploadId, bytes);
    return NextResponse.json({ ok: true }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Ukuran CV maksimal 3 MiB." }, { status: 413, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ error: "CV belum dapat disimpan ke penyimpanan privat. Coba kembali." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
