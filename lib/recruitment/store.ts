import { randomUUID } from "node:crypto";

export const CV_BUCKET = "candidate-cvs";
export const MAX_CV_BYTES = 5 * 1024 * 1024;

// Fail closed until the approved privacy notice is finalized in code.
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

type BackendConfig = { url: string; serviceKey: string };

function backendConfig(): BackendConfig {
  const rawUrl = process.env.SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!rawUrl || !serviceKey) throw new Error("Recruitment backend is not configured.");
  const parsed = new URL(rawUrl);
  if (parsed.protocol !== "https:" || !(parsed.hostname.endsWith(".supabase.co") || parsed.hostname.endsWith(".supabase.in")) ||
      parsed.username || parsed.password || (parsed.pathname !== "" && parsed.pathname !== "/") || parsed.search || parsed.hash) {
    throw new Error("Recruitment backend URL is invalid.");
  }
  return { url: parsed.origin, serviceKey };
}

export function isRecruitmentBackendConfigured(): boolean {
  try { backendConfig(); return true; } catch { return false; }
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

function storagePath(path: string): string {
  return path.split("/").map((part) => encodeURIComponent(part)).join("/");
}

function getHeaders(additional?: HeadersInit): Headers {
  const config = backendConfig();
  const headers = new Headers({ apikey: config.serviceKey, Authorization: "Bearer " + config.serviceKey, Accept: "application/json" });
  if (additional) new Headers(additional).forEach((value, key) => headers.set(key, value));
  return headers;
}

/** Server-only: never import this module from a Client Component. */
export async function recruitmentDb<T = unknown>(path: string, init: RequestInit = {}): Promise<T> {
  const config = backendConfig();
  const headers = getHeaders(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(config.url + "/rest/v1" + (path.startsWith("/") ? path : "/" + path), {
    ...init, headers, cache: "no-store", signal: init.signal ?? AbortSignal.timeout(12000),
  });
  const body = await response.text();
  if (!response.ok) throw new Error("Recruitment database request failed with status " + response.status + ".");
  if (!body) return undefined as T;
  try { return JSON.parse(body) as T; } catch { throw new Error("Recruitment database returned an invalid response."); }
}

export async function recruitmentStorage(path: string, init: RequestInit = {}): Promise<Response> {
  const config = backendConfig();
  const headers = getHeaders(init.headers);
  if (init.body && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(config.url + "/storage/v1" + (path.startsWith("/") ? path : "/" + path), {
    ...init, headers, cache: "no-store", signal: init.signal ?? AbortSignal.timeout(20000),
  });
}

export async function checkRecruitmentServiceReady(): Promise<boolean> {
  if (!isRecruitmentReady()) return false;
  try {
    await recruitmentDb("/job_postings?select=id&limit=1");
    const response = await recruitmentStorage("/bucket/" + CV_BUCKET);
    if (!response.ok) return false;
    const bucket = await response.json() as { id?: string; public?: boolean; file_size_limit?: number; allowed_mime_types?: string[] };
    return bucket.id === CV_BUCKET && bucket.public === false && Number(bucket.file_size_limit) === MAX_CV_BYTES &&
      Array.isArray(bucket.allowed_mime_types) && bucket.allowed_mime_types.includes("application/pdf");
  } catch { return false; }
}

export async function getPublishedJobs(): Promise<RecruitmentJob[]> {
  if (!isRecruitmentBackendConfigured()) return [];
  const query = new URLSearchParams({
    select: "id,slug,title,country,category,summary,description,requirements,image_url,application_deadline,is_published",
    is_published: "eq.true", order: "created_at.desc", limit: "100",
  });
  const rows = await recruitmentDb<RecruitmentJob[]>("/job_postings?" + query.toString());
  const today = new Date().toISOString().slice(0, 10);
  return rows.filter((job) => !job.application_deadline || job.application_deadline >= today);
}

export async function getPublishedJob(id: string): Promise<RecruitmentJob | null> {
  const query = new URLSearchParams({
    select: "id,slug,title,country,category,summary,description,requirements,image_url,application_deadline,is_published",
    id: "eq." + id, is_published: "eq.true", limit: "1",
  });
  const rows = await recruitmentDb<RecruitmentJob[]>("/job_postings?" + query.toString());
  const job = rows[0];
  if (!job || (job.application_deadline && job.application_deadline < new Date().toISOString().slice(0, 10))) return null;
  return job;
}

function safeFileName(name: string): string {
  const safe = name.normalize("NFKC").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 100);
  if (!safe.toLowerCase().endsWith(".pdf")) throw new Error("CV harus PDF.");
  return safe || "cv.pdf";
}

export async function createCandidateUploadIntent(name: string, size: number): Promise<{ id: string; signedUrl: string; expiresAt: string }> {
  if (!Number.isInteger(size) || size < 1 || size > MAX_CV_BYTES) throw new Error("Ukuran CV tidak valid.");
  const fileName = safeFileName(name);
  const id = randomUUID();
  const path = id + "/" + randomUUID() + ".pdf";
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 15 * 60 * 1000).toISOString();
  await recruitmentDb("/candidate_upload_intents", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({ id, storage_path: path, original_file_name: fileName, declared_size: size,
      expires_at: expiresAt, consumed_at: null, created_at: now.toISOString() }),
  });
  const config = backendConfig();
  const signer = await recruitmentStorage("/object/upload/sign/" + CV_BUCKET + "/" + storagePath(path), {
    method: "POST", body: JSON.stringify({}),
  });
  if (!signer.ok) throw new Error("Tidak dapat menyiapkan unggahan CV.");
  const signedData = await signer.json() as { url?: string; signedURL?: string };
  const returnedUrl = signedData.url || signedData.signedURL;
  if (typeof returnedUrl !== "string" || !returnedUrl) throw new Error("URL unggahan tidak valid.");
  const signedUrl = /^https:\/\//i.test(returnedUrl)
    ? returnedUrl
    : config.url + "/storage/v1" + (returnedUrl.startsWith("/") ? returnedUrl : "/" + returnedUrl);
  const parsed = new URL(signedUrl);
  if (parsed.protocol !== "https:" || parsed.origin !== config.url || !parsed.pathname.includes("/object/upload/sign/")) {
    throw new Error("URL unggahan tidak valid.");
  }
  return { id, signedUrl: parsed.toString(), expiresAt };
}

export async function getPendingUploadIntent(id: string): Promise<CandidateUploadIntent | null> {
  const query = new URLSearchParams({
    select: "id,storage_path,original_file_name,declared_size,expires_at,consumed_at,created_at",
    id: "eq." + id, consumed_at: "is.null", expires_at: "gt." + new Date().toISOString(), limit: "1",
  });
  const rows = await recruitmentDb<CandidateUploadIntent[]>("/candidate_upload_intents?" + query.toString());
  return rows[0] ?? null;
}

export async function verifyStoredPdf(path: string, declaredSize: number): Promise<void> {
  const response = await recruitmentStorage("/object/authenticated/" + CV_BUCKET + "/" + storagePath(path));
  if (!response.ok) throw new Error("CV belum diunggah.");
  const size = Number(response.headers.get("content-length") || 0);
  if (size > MAX_CV_BYTES) throw new Error("CV terlalu besar.");
  const mime = (response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (mime && mime !== "application/pdf" && mime !== "application/octet-stream") throw new Error("Jenis CV tidak valid.");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 8 || bytes.length > MAX_CV_BYTES || bytes.length !== declaredSize || bytes.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("Isi CV tidak valid.");
  }
}

export async function submitCandidateApplication(input: {
  uploadId: string; fullName: string; phone: string; email: string | null;
  targetCountry: string; jobId: string; privacyNoticeVersion: string; retentionDays: number;
}): Promise<{ id: string; status: string; created_at: string }> {
  return recruitmentDb<{ id: string; status: string; created_at: string }>("/rpc/submit_candidate_application", {
    method: "POST", body: JSON.stringify({
      p_upload_id: input.uploadId, p_full_name: input.fullName, p_phone: input.phone, p_email: input.email,
      p_target_country: input.targetCountry, p_job_id: input.jobId,
      p_privacy_notice_version: input.privacyNoticeVersion, p_retention_days: input.retentionDays,
    }),
  });
}

export async function getCandidateApplication(id: string): Promise<CandidateApplication | null> {
  const query = new URLSearchParams({
    select: "id,full_name,phone,email,target_country,job_id,job_title_snapshot,cv_storage_path,cv_original_name,status,privacy_notice_version,consent_at,created_at,updated_at,retention_due_at,reviewed_by,reviewed_at,deleted_at",
    id: "eq." + id, limit: "1",
  });
  const rows = await recruitmentDb<CandidateApplication[]>("/candidate_applications?" + query.toString());
  return rows[0] ?? null;
}

export async function getCandidateCvBytes(path: string): Promise<Buffer> {
  const response = await recruitmentStorage("/object/authenticated/" + CV_BUCKET + "/" + storagePath(path));
  if (!response.ok) throw new Error("CV tidak ditemukan.");
  if (Number(response.headers.get("content-length") || 0) > MAX_CV_BYTES) throw new Error("CV terlalu besar.");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length < 8 || bytes.length > MAX_CV_BYTES || bytes.subarray(0, 5).toString("ascii") !== "%PDF-") throw new Error("CV bukan PDF yang valid.");
  return bytes;
}

export async function deleteCandidateCv(path: string): Promise<void> {
  const response = await recruitmentStorage("/object/" + CV_BUCKET, { method: "DELETE", body: JSON.stringify({ prefixes: [path] }) });
  if (!response.ok && response.status !== 404) throw new Error("CV tidak dapat dihapus.");
}

export async function writeCandidateAudit(input: {
  actorType: "admin" | "system"; actorEmail: string; action: string; applicationId: string;
  details?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  await recruitmentDb("/candidate_audit_logs", {
    method: "POST", headers: { Prefer: "return=minimal" },
    body: JSON.stringify({
      actor_type: input.actorType, actor_email: input.actorEmail, action: input.action,
      entity_type: "candidate_application", entity_id: input.applicationId,
      details: input.details ?? {}, created_at: new Date().toISOString(),
    }),
  });
}

export function validRetentionDays(): number {
  const value = Number(process.env.CANDIDATE_RETENTION_DAYS);
  if (!Number.isInteger(value) || value < 1 || value > 3650) throw new Error("Masa retensi belum dikonfigurasi.");
  return value;
}

export function activePrivacyNoticeVersion(): string {
  if (!PRIVACY_NOTICE_APPROVED_IN_CODE || process.env.CANDIDATE_PRIVACY_NOTICE_APPROVED !== "true") throw new Error("Pemberitahuan privasi belum disetujui.");
  const value = process.env.CANDIDATE_PRIVACY_NOTICE_VERSION?.trim();
  if (!value || value.length > 80) throw new Error("Versi pemberitahuan privasi belum dikonfigurasi.");
  return value;
}
