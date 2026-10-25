import { NextResponse } from "next/server";
import { getPublishedJobs, isRecruitmentBackendConfigured } from "@/lib/recruitment/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!isRecruitmentBackendConfigured()) return NextResponse.json({ jobs: [], error: "Lowongan resmi belum dapat dimuat." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  try {
    return NextResponse.json({ jobs: await getPublishedJobs() }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ jobs: [], error: "Lowongan resmi sementara tidak tersedia." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
