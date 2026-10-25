import "server-only";
import { randomUUID } from "node:crypto";

export const MAX_CV_BYTES = 3 * 1024 * 1024;
const PRIVACY_NOTICE_APPROVED_IN_CODE = false;

export type RecruitmentJob = {
  id: string; slug: string; title: string; country: string; category: string; summary: string;
  description: string; requirements: string; image_url: string | null; application_deadline: string | null;
  is_published: boolean; created_at?: string; updated_at?: string; created_by?: string; updated_by?: string;
};
export type CandidateApplication = {
  id: string; full_name: string; phone: string | null; email: string | null; target_country: string | null;
  job_id: string | null; job_title_snapshot: string | null; cv_storage_path: string | null; cv_original_name: string | null;
  status: string; privacy_notice_version: string; consent_at: string; created_at: string; updated_at: string;
  retention_due_at: string | null; reviewed_by: string | null; reviewed_at: string | null; deleted_at: string | null;
};
export type CandidateUploadIntent = {
  id: string; storage_path: string; original_file_name: string; declared_size: number;
  expires_at: string; consumed_at: string | null; created_at: string;
};

type GasConfig = { url: string; secret: string };
type GasEnvelope<T = Record<string, unknown>> = { ok: boolean; error?: string; [key: string]: unknown } & T;

function gasConfig(): GasConfig {
  const rawUrl = process.env.GAS_ADMIN_WEB_APP_URL?.trim();
  const secret = process.env.GAS_ADMIN_SECRET?.trim();
  if (!rawUrl || !secret || secret.length < 32) throw new Error("Recruitment Google Apps Script is not configured.");
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== "https:" || parsed.hostname !== "script.google.com" ||
      !parsed.pathname.endsWith("/exec") || parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error("Recruitment Google Apps Script URL is invalid.");
  }
  return { url: parsed.toString(), secret };
}

export function isRecruitmentBackendConfigured(): boolean {
  try { gasConfig(); return true; } catch { return false; }
}

async function callGas<T = Record<string, unknown>>(
  action: string,
  data?: Record<string, unknown>,
): Promise<GasEnvelope<T>> {
  const config = gasConfig();
  const payload = JSON.stringify({ action, ...(data ? { data } : {}), secret: config.secret });
  const response = await fetch(config.url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: payload,
    cache: "no-store",
    redirect: "follow",
    signal: AbortSignal.timeout(action === "upload_candidate_cv" || action === "download_candidate_cv" ? 45000 : 15000),
  });
  const raw = await response.text();
  if (!response.ok) throw new Error("Recruitment gateway returned HTTP " + response.status + ".");
  let result: GasEnvelope<T>;
  try { result = JSON.parse(raw) as GasEnvelope<T>; } catch { throw new Error("Recruitment gateway returned invalid JSON."); }
  if (result.ok !== true) throw new Error(typeof result.error === "string" ? result.error : "Recruitment request rejected.");
  return result;
}

export function isRecruitmentReady(): boolean {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
  const retention = Number(process.env.CANDIDATE_RETENTION_DAYS);
  return PRIVACY_NOTICE_APPROVED_IN_CODE && isRecruitmentBackendConfigured() && Boolean(redisUrl && redisToken) &&
    Boolean(process.env.ADMIN_SESSION_SECRET && process.env.GOOGLE_CLIENT_ID && process.env.ADMIN_ALLOWED_EMAILS) &&
    process.env.CANDIDATE_PRIVACY_NOTICE_APPROVED === "true" &&
    Boolean(process.env.CANDIDATE_PRIVACY_NOTICE_VERSION?.trim()) &&
    Number.isInteger(retention) && retention >= 1 && retention <= 3650 && Boolean(process.env.CRON_SECRET?.trim());
}

export function publicPrivacyNoticeVersion(): string {
  if (!PRIVACY_NOTICE_APPROVED_IN_CODE || process.env.CANDIDATE_PRIVACY_NOTICE_APPROVED !== "true") return "";
  return process.env.CANDIDATE_PRIVACY_NOTICE_VERSION?.trim().slice(0, 80) || "";
}

export async function checkRecruitmentServiceReady(): Promise<boolean> {
  if (!isRecruitmentReady()) return false;
  try {
    const result = await callGas<{ ready?: boolean }>("recruitment_health");
    return result.ready === true;
  } catch { return false; }
}

function safeFileName(name: string): string {
  const safe = name.normalize("NFKC").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  if (!safe.toLowerCase().endsWith(".pdf")) throw new Error("CV must be a PDF.");
  return safe || "cv.pdf";
}

function validPdf(bytes: Buffer): boolean {
  return bytes.length >= 8 && bytes.length <= MAX_CV_BYTES && bytes.subarray(0, 5).toString("ascii") === "%PDF-";
}

export async function getPublishedJobs(): Promise<RecruitmentJob[]> {
  if (!isRecruitmentBackendConfigured()) return [];
  const result = await callGas<{ jobs?: RecruitmentJob[] }>("list_public_jobs");
  return Array.isArray(result.jobs) ? result.jobs : [];
}

export async function getPublishedJob(id: string): Promise<RecruitmentJob | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const result = await callGas<{ job?: RecruitmentJob | null }>("get_public_job", { id });
  return result.job && typeof result.job === "object" ? result.job : null;
}

export async function createCandidateUploadIntent(
  name: string,
  size: number,
): Promise<{ id: string; expiresAt: string }> {
  if (!Number.isInteger(size) || size < 1 || size > MAX_CV_BYTES) throw new Error("CV size is invalid.");
  const fileName = safeFileName(name);
  const now = new Date();
  const intent = {
    id: randomUUID(),
    original_file_name: fileName,
    declared_size: size,
    expires_at: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
    created_at: now.toISOString(),
  };
  const result = await callGas<{ intent?: CandidateUploadIntent }>("create_candidate_upload_intent", intent);
  if (!result.intent?.id || !result.intent.expires_at) throw new Error("Upload intent was not created.");
  return { id: result.intent.id, expiresAt: result.intent.expires_at };
}

export async function uploadCandidateCv(uploadId: string, bytes: Buffer): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(uploadId) || !validPdf(bytes)) throw new Error("CV PDF is invalid.");
  const result = await callGas<{ file_id?: string }>("upload_candidate_cv", {
    id: uploadId,
    mime_type: "application/pdf",
    base64: bytes.toString("base64"),
  });
  if (typeof result.file_id !== "string" || !result.file_id) throw new Error("CV was not stored.");
}

export async function getPendingUploadIntent(id: string): Promise<CandidateUploadIntent | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const result = await callGas<{ intent?: CandidateUploadIntent | null }>("get_candidate_upload_intent", { id });
  const intent = result.intent;
  if (!intent || !intent.storage_path || intent.consumed_at) return null;
  if (Date.parse(intent.expires_at) <= Date.now()) return null;
  return intent;
}

export async function verifyStoredPdf(path: string, declaredSize: number): Promise<void> {
  const bytes = await getCandidateCvBytes(path);
  if (bytes.length !== declaredSize) throw new Error("Stored CV size does not match the upload.");
}

export async function submitCandidateApplication(input: {
  uploadId: string; fullName: string; phone: string; email: string | null;
  targetCountry: string; jobId: string; privacyNoticeVersion: string; retentionDays: number;
}): Promise<{ id: string; status: string; created_at: string }> {
  const result = await callGas<{ application?: { id: string; status: string; created_at: string } }>(
    "submit_candidate_application",
    {
      application_id: randomUUID(),
      upload_id: input.uploadId,
      full_name: input.fullName,
      phone: input.phone,
      email: input.email,
      target_country: input.targetCountry,
      job_id: input.jobId,
      privacy_notice_version: input.privacyNoticeVersion,
      retention_days: input.retentionDays,
    },
  );
  if (!result.application?.id) throw new Error("Candidate application was not saved.");
  return result.application;
}

export async function getCandidateApplication(id: string): Promise<CandidateApplication | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const result = await callGas<{ application?: CandidateApplication | null }>("get_candidate_application", { id });
  return result.application && typeof result.application === "object" ? result.application : null;
}

export async function getCandidateCvBytes(fileId: string): Promise<Buffer> {
  if (!/^[A-Za-z0-9_-]{15,120}$/.test(fileId)) throw new Error("CV identifier is invalid.");
  const result = await callGas<{ base64?: string; byte_length?: number }>("download_candidate_cv", { file_id: fileId });
  if (typeof result.base64 !== "string") throw new Error("CV was not found.");
  const bytes = Buffer.from(result.base64, "base64");
  if (!validPdf(bytes) || (typeof result.byte_length === "number" && result.byte_length !== bytes.length)) {
    throw new Error("Stored CV is not a valid PDF.");
  }
  return bytes;
}

export async function deleteCandidateCv(fileId: string): Promise<void> {
  if (!/^[A-Za-z0-9_-]{15,120}$/.test(fileId)) throw new Error("CV identifier is invalid.");
  await callGas("delete_candidate_cv", { file_id: fileId });
}

export async function writeCandidateAudit(input: {
  actorType: "admin" | "system"; actorEmail: string; action: string; applicationId: string;
  details?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  await callGas("audit_candidate_application", {
    actor_type: input.actorType, actor_email: input.actorEmail, action: input.action,
    application_id: input.applicationId, details: input.details ?? {},
  });
}

export async function listAdminJobs(): Promise<RecruitmentJob[]> {
  const result = await callGas<{ jobs?: RecruitmentJob[] }>("list_admin_jobs");
  return Array.isArray(result.jobs) ? result.jobs : [];
}

export async function createRecruitmentJob(job: Record<string, unknown>): Promise<RecruitmentJob> {
  const result = await callGas<{ job?: RecruitmentJob }>("create_job", { job });
  if (!result.job) throw new Error("Job was not saved.");
  return result.job;
}

export async function updateRecruitmentJob(
  id: string,
  input: Record<string, unknown>,
): Promise<RecruitmentJob | null> {
  const result = await callGas<{ job?: RecruitmentJob | null }>("update_job", { id, job: input });
  return result.job && typeof result.job === "object" ? result.job : null;
}

export async function getAdminApplications(options: {
  limit: number; offset: number; status: string | null;
}): Promise<Partial<CandidateApplication>[]> {
  const result = await callGas<{ applications?: Partial<CandidateApplication>[] }>("list_candidate_applications", options);
  return Array.isArray(result.applications) ? result.applications : [];
}

export async function updateCandidateApplicationStatus(
  id: string, status: string, actorEmail: string,
): Promise<CandidateApplication | null> {
  const result = await callGas<{ application?: CandidateApplication | null }>(
    "update_candidate_application_status", { id, status, actor_email: actorEmail },
  );
  return result.application && typeof result.application === "object" ? result.application : null;
}

export async function anonymizeCandidateApplication(
  id: string, actorEmail: string, reason: string,
): Promise<void> {
  await callGas("anonymize_candidate_application", { id, actor_email: actorEmail, reason });
}

export async function cleanupCandidateData(): Promise<{
  expiredUploads: number; expiredApplications: number; consumedIntentsDeleted: number;
}> {
  const result = await callGas<{
    expiredUploads?: number; expiredApplications?: number; consumedIntentsDeleted?: number;
  }>("cleanup_candidate_data", { retention_days: validRetentionDays() });
  return {
    expiredUploads: Number(result.expiredUploads || 0),
    expiredApplications: Number(result.expiredApplications || 0),
    consumedIntentsDeleted: Number(result.consumedIntentsDeleted || 0),
  };
}

export function validRetentionDays(): number {
  const value = Number(process.env.CANDIDATE_RETENTION_DAYS);
  if (!Number.isInteger(value) || value < 1 || value > 3650) throw new Error("Retention period is not configured.");
  return value;
}

export function activePrivacyNoticeVersion(): string {
  if (!PRIVACY_NOTICE_APPROVED_IN_CODE || process.env.CANDIDATE_PRIVACY_NOTICE_APPROVED !== "true") {
    throw new Error("Candidate privacy notice has not been approved.");
  }
  const value = process.env.CANDIDATE_PRIVACY_NOTICE_VERSION?.trim();
  if (!value || value.length > 80) throw new Error("Candidate privacy notice version is not configured.");
  return value;
}
