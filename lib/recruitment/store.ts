import "server-only";
import { randomUUID } from "node:crypto";
import {
  deleteStorageObject,
  downloadPrivateObject,
  encodeFirestoreFields,
  firebaseDocumentName,
  firebaseHealthCheck,
  firestoreCommit,
  firestoreCreateDocument,
  firestoreDeleteDocument,
  firestoreGetDocument,
  firestoreListDocuments,
  firestoreQueryDocuments,
  firestoreSetDocument,
  isFirebaseAuthConfigured,
  isFirebaseConfigured,
  uploadPrivateObject,
} from "@/lib/firebase/server";

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
  uploaded_at?: string | null; uploaded_size?: number | null;
};

export function isRecruitmentBackendConfigured(): boolean {
  return isFirebaseConfigured();
}
export function isRecruitmentReady(): boolean {
  const redisUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.UPSTASH_REDIS_REST_KV_REST_API_URL;
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN;
  const retention = Number(process.env.CANDIDATE_RETENTION_DAYS);
  return PRIVACY_NOTICE_APPROVED_IN_CODE && isFirebaseConfigured() && isFirebaseAuthConfigured() &&
    Boolean(redisUrl && redisToken) &&
    Boolean(process.env.ADMIN_SESSION_SECRET && process.env.GOOGLE_CLIENT_ID && process.env.ADMIN_ALLOWED_EMAILS) &&
    process.env.CANDIDATE_PRIVACY_NOTICE_APPROVED === "true" &&
    Boolean(process.env.CANDIDATE_PRIVACY_NOTICE_VERSION?.trim()) &&
    Number.isInteger(retention) && retention >= 1 && retention <= 3650 &&
    Boolean(process.env.CRON_SECRET?.trim());
}
export function publicPrivacyNoticeVersion(): string {
  if (!PRIVACY_NOTICE_APPROVED_IN_CODE || process.env.CANDIDATE_PRIVACY_NOTICE_APPROVED !== "true") return "";
  return process.env.CANDIDATE_PRIVACY_NOTICE_VERSION?.trim().slice(0, 80) || "";
}
export async function checkRecruitmentServiceReady(): Promise<boolean> {
  if (!isRecruitmentReady()) return false;
  try { return await firebaseHealthCheck(); } catch { return false; }
}

function safeFileName(name: string): string {
  const safe = name.normalize("NFKC").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120);
  if (!safe.toLowerCase().endsWith(".pdf")) throw new Error("CV must be a PDF.");
  return safe || "cv.pdf";
}
function validPdf(bytes: Buffer): boolean {
  return bytes.length >= 8 && bytes.length <= MAX_CV_BYTES && bytes.subarray(0, 5).toString("ascii") === "%PDF-";
}
function isCandidateStoragePath(path: unknown): path is string {
  return typeof path === "string" &&
    /^candidate-cvs\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.pdf$/i.test(path);
}
function asApplication(record: { id: string; data: Record<string, unknown> }): CandidateApplication {
  return { ...record.data, id: record.id } as unknown as CandidateApplication;
}
function asJob(record: { id: string; data: Record<string, unknown> }): RecruitmentJob {
  return { ...record.data, id: record.id } as unknown as RecruitmentJob;
}
function jakartaDate(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export async function getPublishedJobs(): Promise<RecruitmentJob[]> {
  if (!isFirebaseConfigured()) return [];
  const today = jakartaDate();
  const records = await firestoreListDocuments("recruitment_jobs", 500);
  return records.map(asJob)
    .filter(job => job.is_published === true && (!job.application_deadline || job.application_deadline >= today))
    .sort((a, b) => (a.application_deadline || "9999-12-31").localeCompare(b.application_deadline || "9999-12-31"));
}
export async function getPublishedJob(id: string): Promise<RecruitmentJob | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id) || !isFirebaseConfigured()) return null;
  const record = await firestoreGetDocument("recruitment_jobs", id);
  if (!record) return null;
  const job = asJob(record);
  const today = jakartaDate();
  return job.is_published === true && (!job.application_deadline || job.application_deadline >= today) ? job : null;
}

export async function createCandidateUploadIntent(
  name: string, size: number,
): Promise<{ id: string; expiresAt: string }> {
  if (!isFirebaseConfigured()) throw new Error("Firebase has not been configured.");
  if (!Number.isInteger(size) || size < 1 || size > MAX_CV_BYTES) throw new Error("CV size is invalid.");
  const id = randomUUID();
  const now = new Date();
  const intent: CandidateUploadIntent = {
    id, storage_path: "candidate-cvs/" + id + ".pdf",
    original_file_name: safeFileName(name), declared_size: size,
    expires_at: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
    consumed_at: null, created_at: now.toISOString(), uploaded_at: null, uploaded_size: null,
  };
  await firestoreCreateDocument("candidate_upload_intents", id, intent as unknown as Record<string, unknown>);
  return { id, expiresAt: intent.expires_at };
}

export async function uploadCandidateCv(uploadId: string, bytes: Buffer): Promise<void> {
  if (!/^[0-9a-f-]{36}$/i.test(uploadId) || !validPdf(bytes)) throw new Error("CV PDF is invalid.");
  const record = await firestoreGetDocument("candidate_upload_intents", uploadId);
  if (!record) throw new Error("Upload intent was not found.");
  const intent = { ...record.data, id: record.id } as unknown as CandidateUploadIntent;
  if (intent.consumed_at || !intent.expires_at || Date.parse(intent.expires_at) <= Date.now() ||
      intent.declared_size !== bytes.length || intent.storage_path !== "candidate-cvs/" + uploadId + ".pdf" ||
      intent.uploaded_at) {
    throw new Error("Upload intent is invalid, expired, or already used.");
  }
  await uploadPrivateObject(intent.storage_path, bytes);
  await firestoreSetDocument("candidate_upload_intents", uploadId, {
    ...record.data, id: uploadId, uploaded_at: new Date().toISOString(), uploaded_size: bytes.length,
  });
}

export async function getPendingUploadIntent(id: string): Promise<CandidateUploadIntent | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const record = await firestoreGetDocument("candidate_upload_intents", id);
  if (!record) return null;
  const intent = { ...record.data, id: record.id } as unknown as CandidateUploadIntent;
  if (intent.consumed_at || !isCandidateStoragePath(intent.storage_path) ||
      !intent.expires_at || Date.parse(intent.expires_at) <= Date.now() ||
      intent.uploaded_at == null || intent.uploaded_size !== intent.declared_size) return null;
  return intent;
}
export async function verifyStoredPdf(path: string, declaredSize: number): Promise<void> {
  if (!isCandidateStoragePath(path)) throw new Error("Stored CV path is invalid.");
  const bytes = await downloadPrivateObject(path);
  if (!validPdf(bytes) || bytes.length !== declaredSize) throw new Error("Stored CV does not match the upload.");
}

export async function submitCandidateApplication(input: {
  uploadId: string; fullName: string; phone: string; email: string | null;
  targetCountry: string; jobId: string; privacyNoticeVersion: string; retentionDays: number;
}): Promise<{ id: string; status: string; created_at: string }> {
  const intentRecord = await firestoreGetDocument("candidate_upload_intents", input.uploadId);
  if (!intentRecord?.updateTime) throw new Error("Upload intent is not available.");
  const intent = { ...intentRecord.data, id: intentRecord.id } as unknown as CandidateUploadIntent;
  if (intent.consumed_at || !intent.expires_at || Date.parse(intent.expires_at) <= Date.now() ||
      !intent.uploaded_at || intent.uploaded_size !== intent.declared_size || !isCandidateStoragePath(intent.storage_path)) {
    throw new Error("Upload intent is expired, incomplete, or already consumed.");
  }
  if (!Number.isInteger(input.retentionDays) || input.retentionDays < 1 || input.retentionDays > 3650) {
    throw new Error("Candidate retention is not valid.");
  }
  const jobRecord = await firestoreGetDocument("recruitment_jobs", input.jobId);
  if (!jobRecord) throw new Error("Recruitment job does not exist.");
  const job = asJob(jobRecord);
  const today = jakartaDate();
  if (job.is_published !== true || job.country !== input.targetCountry ||
      (job.application_deadline && job.application_deadline < today)) {
    throw new Error("Recruitment job is no longer open.");
  }

  const now = new Date();
  const createdAt = now.toISOString();
  // Reuse the unpredictable one-time upload-intent ID as the application ID, then
  // atomically consume that intent and create the application to prevent replay.
  const applicationId = input.uploadId;
  const application: CandidateApplication = {
    id: applicationId, full_name: input.fullName, phone: input.phone, email: input.email,
    target_country: input.targetCountry, job_id: input.jobId, job_title_snapshot: job.title,
    cv_storage_path: intent.storage_path, cv_original_name: intent.original_file_name,
    status: "received", privacy_notice_version: input.privacyNoticeVersion, consent_at: createdAt,
    created_at: createdAt, updated_at: createdAt,
    retention_due_at: new Date(now.getTime() + input.retentionDays * 86400000).toISOString(),
    reviewed_by: null, reviewed_at: null, deleted_at: null,
  };
  const auditId = randomUUID();
  const audit = {
    id: auditId, actor_type: "system", actor_email: "system",
    action: "candidate_application_received", application_id: applicationId,
    details: { source: "public_form" }, created_at: createdAt,
  };
  await firestoreCommit([
    {
      update: {
        name: firebaseDocumentName("candidate_upload_intents", input.uploadId),
        fields: encodeFirestoreFields({ consumed_at: createdAt, application_id: applicationId }),
      },
      updateMask: { fieldPaths: ["consumed_at", "application_id"] },
      currentDocument: { updateTime: intentRecord.updateTime },
    },
    {
      update: {
        name: firebaseDocumentName("candidate_applications", applicationId),
        fields: encodeFirestoreFields(application as unknown as Record<string, unknown>),
      },
      currentDocument: { exists: false },
    },
    {
      update: {
        name: firebaseDocumentName("candidate_audit", auditId),
        fields: encodeFirestoreFields(audit),
      },
      currentDocument: { exists: false },
    },
  ]);
  return { id: applicationId, status: "received", created_at: createdAt };
}

export async function getCandidateApplication(id: string): Promise<CandidateApplication | null> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const record = await firestoreGetDocument("candidate_applications", id);
  return record ? asApplication(record) : null;
}
export async function getCandidateCvBytes(path: string): Promise<Buffer> {
  if (!isCandidateStoragePath(path)) throw new Error("Candidate CV path is invalid.");
  const bytes = await downloadPrivateObject(path);
  if (!validPdf(bytes)) throw new Error("Stored candidate file is not a valid PDF.");
  return bytes;
}
export async function deleteCandidateCv(path: string): Promise<void> {
  if (!isCandidateStoragePath(path)) throw new Error("Candidate CV path is invalid.");
  await deleteStorageObject(path);
}
export async function writeCandidateAudit(input: {
  actorType: "admin" | "system"; actorEmail: string; action: string; applicationId: string;
  details?: Record<string, string | number | boolean | null>;
}): Promise<void> {
  const id = randomUUID();
  await firestoreCreateDocument("candidate_audit", id, {
    id, actor_type: input.actorType, actor_email: input.actorEmail.slice(0, 254),
    action: input.action.slice(0, 80), application_id: input.applicationId,
    details: input.details ?? {}, created_at: new Date().toISOString(),
  });
}
export async function listAdminJobs(): Promise<RecruitmentJob[]> {
  const records = await firestoreListDocuments("recruitment_jobs", 500);
  return records.map(asJob).sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
}
export async function createRecruitmentJob(job: Record<string, unknown>): Promise<RecruitmentJob> {
  const id = typeof job.id === "string" ? job.id : "";
  return asJob(await firestoreCreateDocument("recruitment_jobs", id, job));
}
export async function updateRecruitmentJob(id: string, input: Record<string, unknown>): Promise<RecruitmentJob | null> {
  const existing = await firestoreGetDocument("recruitment_jobs", id);
  if (!existing) return null;
  return asJob(await firestoreSetDocument("recruitment_jobs", id, { ...existing.data, ...input, id }));
}
export async function getAdminApplications(options: {
  limit: number; offset: number; status: string | null;
}): Promise<Partial<CandidateApplication>[]> {
  // In-memory filtering avoids requiring a composite Firestore index during initial setup.
  const records = await firestoreListDocuments("candidate_applications", 5000);
  const filtered = records.map(asApplication)
    .filter(app => !options.status || app.status === options.status)
    .sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
  return filtered.slice(options.offset, options.offset + options.limit).map(app => ({
    id: app.id,
    full_name: app.full_name,
    phone: app.phone,
    email: app.email,
    target_country: app.target_country,
    job_title_snapshot: app.job_title_snapshot,
    status: app.status,
    cv_original_name: app.cv_original_name,
    created_at: app.created_at,
    retention_due_at: app.retention_due_at,
  }));
}
export async function updateCandidateApplicationStatus(
  id: string, status: string, actorEmail: string,
): Promise<CandidateApplication | null> {
  const existing = await getCandidateApplication(id);
  if (!existing || existing.status === "deleted") return null;
  const updatedAt = new Date().toISOString();
  const updated = await firestoreSetDocument("candidate_applications", id, {
    ...existing, status, updated_at: updatedAt, reviewed_by: actorEmail, reviewed_at: updatedAt,
  });
  await writeCandidateAudit({ actorType: "admin", actorEmail, action: "candidate_status_changed", applicationId: id, details: { status } });
  return asApplication(updated);
}
export async function anonymizeCandidateApplication(id: string, actorEmail: string, reason: string): Promise<void> {
  const existing = await getCandidateApplication(id);
  if (!existing || existing.status === "deleted") return;
  // Remove the private file before clearing its reference. Repeated deletion is safe (404 is accepted).
  if (existing.cv_storage_path) await deleteCandidateCv(existing.cv_storage_path);
  const deletedAt = new Date().toISOString();
  await firestoreSetDocument("candidate_applications", id, {
    ...existing,
    full_name: "Data dihapus", phone: null, email: null, target_country: null,
    job_id: null, job_title_snapshot: null, cv_storage_path: null, cv_original_name: null,
    status: "deleted", retention_due_at: null, deleted_at: deletedAt, updated_at: deletedAt,
  });
  await writeCandidateAudit({
    actorType: actorEmail === "system" ? "system" : "admin",
    actorEmail, action: "candidate_data_anonymized", applicationId: id,
    details: { reason: reason.slice(0, 80) },
  });
}
export async function cleanupCandidateData(): Promise<{
  expiredUploads: number; expiredApplications: number; consumedIntentsDeleted: number;
}> {
  const now = new Date().toISOString();
  const expired = await firestoreQueryDocuments("candidate_upload_intents", {
    filters: [{ field: "expires_at", op: "LESS_THAN_OR_EQUAL", value: now }],
    limit: 500,
  });
  let expiredUploads = 0;
  let consumedIntentsDeleted = 0;
  for (const record of expired) {
    const consumed = Boolean(record.data.consumed_at);
    if (!consumed && isCandidateStoragePath(record.data.storage_path)) {
      await deleteCandidateCv(record.data.storage_path);
      expiredUploads += 1;
    } else if (consumed) {
      consumedIntentsDeleted += 1;
    }
    await firestoreDeleteDocument("candidate_upload_intents", record.id);
  }

  const applications = await firestoreQueryDocuments("candidate_applications", {
    filters: [{ field: "retention_due_at", op: "LESS_THAN_OR_EQUAL", value: now }],
    limit: 500,
  });
  let expiredApplications = 0;
  for (const record of applications) {
    if (record.data.status === "deleted") continue;
    await anonymizeCandidateApplication(record.id, "system", "retention_expired");
    expiredApplications += 1;
  }
  return { expiredUploads, expiredApplications, consumedIntentsDeleted };
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
