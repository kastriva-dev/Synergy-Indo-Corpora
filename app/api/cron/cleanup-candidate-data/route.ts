import { NextRequest, NextResponse } from "next/server";
import { deleteCandidateCv, isRecruitmentBackendConfigured, recruitmentDb } from "@/lib/recruitment/store";

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
  let expiredUploads = 0;
  let expiredApplications = 0;
  try {
    const now = new Date().toISOString();
    const today = now.slice(0, 10);
    const expiredIntents = await recruitmentDb<Array<{ id: string; storage_path: string }>>(
      "/candidate_upload_intents?select=id,storage_path&consumed_at=is.null&expires_at=lt." + encodeURIComponent(now) + "&limit=100"
    );
    for (const intent of expiredIntents) {
      await deleteCandidateCv(intent.storage_path);
      await recruitmentDb("/candidate_upload_intents?id=eq." + encodeURIComponent(intent.id), { method: "DELETE", headers: { Prefer: "return=minimal" } });
      expiredUploads++;
    }
    const consumedIntents = await recruitmentDb<Array<{ id: string }>>(
      "/candidate_upload_intents?select=id&consumed_at=not.is.null&created_at=lt." + encodeURIComponent(new Date(Date.now() - 7 * 86400000).toISOString()) + "&limit=100"
    );
    for (const intent of consumedIntents) {
      await recruitmentDb("/candidate_upload_intents?id=eq." + encodeURIComponent(intent.id), { method: "DELETE", headers: { Prefer: "return=minimal" } });
    }
    const dueApplications = await recruitmentDb<Array<{ id: string; cv_storage_path: string | null }>>(
      "/candidate_applications?select=id,cv_storage_path&status=neq.deleted&retention_due_at=lte." + encodeURIComponent(today) + "&limit=100"
    );
    for (const app of dueApplications) {
      if (app.cv_storage_path) await deleteCandidateCv(app.cv_storage_path);
      await recruitmentDb("/rpc/anonymize_candidate_application", {
        method: "POST",
        body: JSON.stringify({ p_application_id: app.id, p_actor_email: "system:retention-job", p_reason: "retention_expired" }),
      });
      expiredApplications++;
    }
    return NextResponse.json({ ok: true, expiredUploads, expiredApplications, consumedIntentsDeleted: consumedIntents.length }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Cleanup did not complete; inspect metrics without candidate data." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
