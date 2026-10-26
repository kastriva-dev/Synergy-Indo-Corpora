import { NextRequest, NextResponse } from "next/server";
import { cleanupCandidateData, isRecruitmentBackendConfigured } from "@/lib/recruitment/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected || request.headers.get("authorization") !== "Bearer " + expected) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  if (!isRecruitmentBackendConfigured()) {
    return NextResponse.json({ error: "Backend not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  try {
    const result = await cleanupCandidateData();
    return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Cleanup did not complete; inspect metrics without candidate data." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
