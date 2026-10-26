import "server-only";
import { createSign, randomUUID } from "node:crypto";

const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const SCOPES = "https://www.googleapis.com/auth/datastore https://www.googleapis.com/auth/devstorage.read_write";

type FirebaseConfig = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
  bucket: string;
};
type RestDocument = { name?: string; fields?: Record<string, unknown>; updateTime?: string };
export type FirestoreDocumentRecord = { id: string; data: Record<string, unknown>; updateTime?: string };
export type FirestoreFilter = { field: string; op: "EQUAL" | "LESS_THAN_OR_EQUAL"; value: unknown };

let tokenCache: { value: string; expiresAt: number } | null = null;
let tokenRequest: Promise<string> | null = null;

function config(): FirebaseConfig {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim() || "";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim() || "";
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n").trim();
  const bucket = process.env.FIREBASE_STORAGE_BUCKET?.trim() || "";
  if (!/^[a-z0-9][a-z0-9-]{4,61}[a-z0-9]$/.test(projectId) ||
      !/^[^@\s]+@[^@\s]+\.iam\.gserviceaccount\.com$/.test(clientEmail) ||
      !privateKey.includes("-----BEGIN PRIVATE KEY-----") ||
      !/^[a-z0-9][a-z0-9._-]{1,220}$/.test(bucket)) {
    throw new Error("Firebase server configuration is incomplete or invalid.");
  }
  return { projectId, clientEmail, privateKey, bucket };
}

export function isFirebaseConfigured(): boolean {
  try { config(); return true; } catch { return false; }
}

export function isFirebaseAuthConfigured(): boolean {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim() || "";
  return /^[a-z0-9][a-z0-9-]{4,61}[a-z0-9]$/.test(projectId) &&
    Boolean(process.env.FIREBASE_WEB_API_KEY?.trim());
}

function b64url(value: string): string {
  return Buffer.from(value, "utf8").toString("base64url");
}

async function accessToken(): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 120_000) return tokenCache.value;
  if (tokenRequest) return tokenRequest;
  tokenRequest = (async () => {
    const cfg = config();
    const now = Math.floor(Date.now() / 1000);
    const unsigned = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" })) + "." +
      b64url(JSON.stringify({
        iss: cfg.clientEmail,
        scope: SCOPES,
        aud: TOKEN_ENDPOINT,
        iat: now,
        exp: now + 3600,
      }));
    const signer = createSign("RSA-SHA256");
    signer.update(unsigned);
    signer.end();
    const assertion = unsigned + "." + signer.sign(cfg.privateKey).toString("base64url");
    const response = await fetch(TOKEN_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error("Google service-account authentication failed.");
    const body = await response.json() as { access_token?: unknown; expires_in?: unknown };
    if (typeof body.access_token !== "string" || !body.access_token ||
        typeof body.expires_in !== "number" || !Number.isFinite(body.expires_in)) {
      throw new Error("Google returned an invalid access token response.");
    }
    tokenCache = { value: body.access_token, expiresAt: Date.now() + Math.max(60, body.expires_in) * 1000 };
    return body.access_token;
  })();
  try { return await tokenRequest; } finally { tokenRequest = null; }
}

async function googleFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  headers.set("Authorization", "Bearer " + await accessToken());
  if (typeof init.body === "string" && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  return fetch(url, {
    ...init,
    headers,
    cache: "no-store",
    signal: init.signal ?? AbortSignal.timeout(20_000),
  });
}

async function requireOk(response: Response, operation: string): Promise<void> {
  if (response.ok) return;
  await response.arrayBuffer().catch(() => undefined);
  throw new Error(operation + " failed with HTTP " + response.status + ".");
}

function root(): string {
  const cfg = config();
  return "https://firestore.googleapis.com/v1/projects/" + encodeURIComponent(cfg.projectId) +
    "/databases/(default)/documents";
}
function validCollection(value: string): boolean { return /^[A-Za-z][A-Za-z0-9_]{0,62}$/.test(value); }
function validDocId(value: string): boolean { return /^[A-Za-z0-9_-]{1,180}$/.test(value) && !/^__.*__$/.test(value); }

export function firebaseDocumentName(collection: string, id: string): string {
  if (!validCollection(collection) || !validDocId(id)) throw new Error("Firebase document path is invalid.");
  return root() + "/" + collection + "/" + encodeURIComponent(id);
}

function encodeValue(value: unknown): Record<string, unknown> {
  if (value === null || typeof value === "undefined") return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return { nullValue: null };
    return Number.isSafeInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  if (typeof value === "object") return { mapValue: { fields: encodeFirestoreFields(value as Record<string, unknown>) } };
  return { stringValue: String(value) };
}

export function encodeFirestoreFields(value: Record<string, unknown>): Record<string, unknown> {
  const fields: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item !== "undefined") fields[key] = encodeValue(item);
  }
  return fields;
}

function decodeValue(value: unknown): unknown {
  if (!value || typeof value !== "object") return undefined;
  const source = value as Record<string, unknown>;
  if ("nullValue" in source) return null;
  if (typeof source.stringValue === "string") return source.stringValue;
  if (typeof source.booleanValue === "boolean") return source.booleanValue;
  if (typeof source.integerValue === "string") {
    const parsed = Number(source.integerValue);
    return Number.isSafeInteger(parsed) ? parsed : source.integerValue;
  }
  if (typeof source.doubleValue === "number") return source.doubleValue;
  if (typeof source.timestampValue === "string") return source.timestampValue;
  if (source.arrayValue && typeof source.arrayValue === "object") {
    return ((source.arrayValue as { values?: unknown[] }).values || []).map(decodeValue);
  }
  if (source.mapValue && typeof source.mapValue === "object") {
    return decodeFirestoreFields((source.mapValue as { fields?: Record<string, unknown> }).fields || {});
  }
  return undefined;
}
function decodeFirestoreFields(fields: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, decodeValue(value)]));
}
function decodeDocument(document: RestDocument): FirestoreDocumentRecord {
  const parts = String(document.name || "").split("/");
  return {
    id: parts[parts.length - 1] || "",
    data: decodeFirestoreFields(document.fields || {}),
    ...(typeof document.updateTime === "string" ? { updateTime: document.updateTime } : {}),
  };
}

export async function firestoreGetDocument(collection: string, id: string): Promise<FirestoreDocumentRecord | null> {
  const response = await googleFetch(firebaseDocumentName(collection, id), { method: "GET", signal: AbortSignal.timeout(12_000) });
  if (response.status === 404) return null;
  await requireOk(response, "Firestore document read");
  return decodeDocument(await response.json() as RestDocument);
}
export async function firestoreSetDocument(
  collection: string, id: string, data: Record<string, unknown>,
): Promise<FirestoreDocumentRecord> {
  const name = firebaseDocumentName(collection, id);
  const response = await googleFetch(name, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, fields: encodeFirestoreFields(data) }),
  });
  await requireOk(response, "Firestore document write");
  return decodeDocument(await response.json() as RestDocument);
}
export async function firestoreCreateDocument(
  collection: string, id: string, data: Record<string, unknown>,
): Promise<FirestoreDocumentRecord> {
  if (!validCollection(collection) || !validDocId(id)) throw new Error("Firebase document path is invalid.");
  const url = new URL(root() + "/" + collection);
  url.searchParams.set("documentId", id);
  const response = await googleFetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ fields: encodeFirestoreFields(data) }),
  });
  await requireOk(response, "Firestore document create");
  return decodeDocument(await response.json() as RestDocument);
}
export async function firestoreDeleteDocument(collection: string, id: string): Promise<void> {
  const response = await googleFetch(firebaseDocumentName(collection, id), { method: "DELETE" });
  if (response.status === 404) return;
  await requireOk(response, "Firestore document delete");
}
export async function firestoreListDocuments(collection: string, limit = 500): Promise<FirestoreDocumentRecord[]> {
  if (!validCollection(collection)) throw new Error("Firestore collection is invalid.");
  const maximum = Math.max(1, Math.min(5000, Math.floor(limit)));
  const result: FirestoreDocumentRecord[] = [];
  let pageToken = "";
  do {
    const url = new URL(root() + "/" + collection);
    url.searchParams.set("pageSize", String(Math.min(1000, maximum - result.length)));
    if (pageToken) url.searchParams.set("pageToken", pageToken);
    const response = await googleFetch(url.toString(), { method: "GET" });
    await requireOk(response, "Firestore collection read");
    const body = await response.json() as { documents?: RestDocument[]; nextPageToken?: string };
    for (const document of body.documents || []) {
      result.push(decodeDocument(document));
      if (result.length >= maximum) break;
    }
    pageToken = body.nextPageToken || "";
  } while (pageToken && result.length < maximum);
  return result;
}
export async function firestoreQueryDocuments(
  collection: string,
  options: { filters?: FirestoreFilter[]; limit?: number; offset?: number } = {},
): Promise<FirestoreDocumentRecord[]> {
  if (!validCollection(collection)) throw new Error("Firestore collection is invalid.");
  const filters = (options.filters || []).filter(filter =>
    /^[A-Za-z_][A-Za-z0-9_]*$/.test(filter.field) &&
    (filter.op === "EQUAL" || filter.op === "LESS_THAN_OR_EQUAL"));
  const structuredQuery: Record<string, unknown> = { from: [{ collectionId: collection }] };
  if (filters.length === 1) {
    structuredQuery.where = { fieldFilter: { field: { fieldPath: filters[0].field }, op: filters[0].op, value: encodeValue(filters[0].value) } };
  } else if (filters.length > 1) {
    structuredQuery.where = { compositeFilter: { op: "AND", filters: filters.map(filter => ({
      fieldFilter: { field: { fieldPath: filter.field }, op: filter.op, value: encodeValue(filter.value) },
    })) } };
  }
  if (options.limit !== undefined) structuredQuery.limit = Math.max(1, Math.min(1000, Math.floor(options.limit)));
  if (options.offset !== undefined) structuredQuery.offset = Math.max(0, Math.min(10_000, Math.floor(options.offset)));
  const response = await googleFetch(root() + ":runQuery", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ structuredQuery }),
  });
  await requireOk(response, "Firestore query");
  const rows = await response.json() as Array<{ document?: RestDocument }>;
  return rows.filter(row => row.document).map(row => decodeDocument(row.document as RestDocument));
}
export async function firestoreCommit(writes: Record<string, unknown>[]): Promise<void> {
  const response = await googleFetch(root() + ":commit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ writes }),
    signal: AbortSignal.timeout(20_000),
  });
  await requireOk(response, "Firestore batch commit");
}

function objectPath(path: string): string {
  const uuid = "[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}";
  const pattern = new RegExp("^(candidate-cvs/" + uuid + "\\.pdf|public-media/" + uuid + "\\.(jpg|png|webp))$", "i");
  if (!pattern.test(path)) throw new Error("Firebase Storage object path is invalid.");
  return path;
}
function objectUrl(path: string): string {
  const cfg = config();
  return "https://storage.googleapis.com/storage/v1/b/" + encodeURIComponent(cfg.bucket) +
    "/o/" + encodeURIComponent(objectPath(path));
}
async function uploadObject(path: string, bytes: Buffer, mime: string): Promise<void> {
  const cfg = config();
  const url = new URL("https://storage.googleapis.com/upload/storage/v1/b/" + encodeURIComponent(cfg.bucket) + "/o");
  url.searchParams.set("uploadType", "media");
  url.searchParams.set("name", objectPath(path));
  url.searchParams.set("ifGenerationMatch", "0");
  const response = await googleFetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": mime },
    body: bytes,
    signal: AbortSignal.timeout(45_000),
  });
  await requireOk(response, "Firebase Storage upload");
}
export async function uploadPrivateObject(path: string, bytes: Buffer): Promise<void> {
  const checked = objectPath(path);
  if (!checked.startsWith("candidate-cvs/") || bytes.length < 8 ||
      bytes.length > 3 * 1024 * 1024 || bytes.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("Private candidate PDF is invalid.");
  }
  await uploadObject(checked, bytes, "application/pdf");
}
export async function downloadPrivateObject(path: string): Promise<Buffer> {
  const checked = objectPath(path);
  if (!checked.startsWith("candidate-cvs/")) throw new Error("Private candidate path is invalid.");
  const response = await googleFetch(objectUrl(checked) + "?alt=media", {
    method: "GET",
    signal: AbortSignal.timeout(45_000),
  });
  await requireOk(response, "Private candidate file read");
  return Buffer.from(await response.arrayBuffer());
}
export async function deleteStorageObject(path: string): Promise<void> {
  const response = await googleFetch(objectUrl(path), { method: "DELETE" });
  if (response.status === 404) return;
  await requireOk(response, "Firebase Storage object delete");
}
export async function uploadPublicMedia(bytes: Buffer, contentType: string): Promise<string> {
  const extension = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" } as Record<string, string>)[contentType];
  if (!extension || bytes.length < 1 || bytes.length > 2_200_000) throw new Error("Public media file type or size is invalid.");
  const path = "public-media/" + randomUUID() + "." + extension;
  const token = randomUUID();
  await uploadObject(path, bytes, contentType);
  try {
    const response = await googleFetch(objectUrl(path) + "?fields=name,metadata", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ metadata: { firebaseStorageDownloadTokens: token } }),
    });
    await requireOk(response, "Public media token configuration");
  } catch (error) {
    await deleteStorageObject(path).catch(() => undefined);
    throw error;
  }
  return "https://firebasestorage.googleapis.com/v0/b/" + encodeURIComponent(config().bucket) +
    "/o/" + encodeURIComponent(path) + "?alt=media&token=" + encodeURIComponent(token);
}

export async function firebaseHealthCheck(): Promise<boolean> {
  await firestoreListDocuments("system_health_probe", 1);
  return true;
}
