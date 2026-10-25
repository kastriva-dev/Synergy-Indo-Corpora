import { NextRequest, NextResponse } from "next/server";
import { sameOrigin } from "@/lib/admin/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/admin/rate-limit";
import {
  activePrivacyNoticeVersion, getPendingUploadIntent, getPublishedJob, isRecruitmentReady,
  submitCandidateApplication, validRetentionDays, verifyStoredPdf,
} from "@/lib/recruitment/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function cleanText(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const clean = value.normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g, " ").trim();
  return clean && clean.length <= max ? clean : null;
}

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origin tidak sah." }, { status: 403 });
  const blocked = rateLimitResponse(await checkRateLimit(request, "candidate-apply", 5, 3600));
  if (blocked) return blocked;
  if (!isRecruitmentReady()) return NextResponse.json({ error: "Pendaftaran kandidat belum diaktifkan." }, { status: 503, headers: { "Cache-Control": "no-store" } });

  try {
    const raw = await request.text();
    if (raw.length > 8000) return NextResponse.json({ error: "Permintaan terlalu besar." }, { status: 413 });
    const body = JSON.parse(raw) as Record<string, unknown>;
    if (typeof body.website === "string" && body.website.trim()) return NextResponse.json({ ok: true, reference: "received" }, { status: 201, headers: { "Cache-Control": "no-store" } });

    const fullName = cleanText(body.name, 120);
    const phone = cleanText(body.phone, 40);
    const country = cleanText(body.country, 100);
    const uploadId = typeof body.uploadId === "string" ? body.uploadId : "";
    const jobId = typeof body.jobId === "string" ? body.jobId : "";
    const privacyVersion = activePrivacyNoticeVersion();
    if (!fullName || fullName.length < 2 || !phone || !country || !UUID.test(uploadId) || !UUID.test(jobId) ||
        body.consent !== true || body.privacyNoticeVersion !== privacyVersion) {
      return NextResponse.json({ error: "Lengkapi data wajib dan persetujuan pemberitahuan privasi." }, { status: 400 });
    }
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 8 || digits.length > 16) return NextResponse.json({ error: "Nomor telepon tidak valid." }, { status: 400 });
    let email: string | null = null;
    if (body.email !== "" && body.email != null) {
      const cleanEmail = cleanText(body.email, 254);
      if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) return NextResponse.json({ error: "Alamat email tidak valid." }, { status: 400 });
      email = cleanEmail.toLowerCase();
    }
    const [intent, job] = await Promise.all([getPendingUploadIntent(uploadId), getPublishedJob(jobId)]);
    if (!intent) return NextResponse.json({ error: "Sesi unggah CV kedaluwarsa. Unggah ulang CV Anda." }, { status: 409 });
    if (!job || job.country !== country) return NextResponse.json({ error: "Posisi tidak tersedia. Muat ulang daftar lowongan." }, { status: 400 });
    await verifyStoredPdf(intent.storage_path, intent.declared_size);
    const result = await submitCandidateApplication({
      uploadId, fullName, phone: digits, email, targetCountry: country, jobId,
      privacyNoticeVersion: privacyVersion, retentionDays: validRetentionDays(),
    });
    return NextResponse.json({ ok: true, reference: result.id }, { status: 201, headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Lamaran belum dapat disimpan. Periksa data Anda atau coba lagi nanti." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
