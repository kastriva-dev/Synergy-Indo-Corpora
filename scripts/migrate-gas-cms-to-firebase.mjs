#!/usr/bin/env node
/**
 * One-time CMS migration from the legacy private GAS admin gateway to Firebase Firestore.
 * Default is dry-run. Use --apply only after reviewing the summary and confirming the target is staging.
 * This script reads site/program/gallery only; it never requests candidate records or CVs.
 */
import { createSign } from "node:crypto";

const apply = process.argv.includes("--apply");
const selected = {
  site: process.argv.includes("--site"),
  programs: process.argv.includes("--programs"),
  gallery: process.argv.includes("--gallery"),
};
if (apply && !Object.values(selected).some(Boolean)) {
  throw new Error("Choose one or more collections explicitly: --site, --programs, --gallery. No data was changed.");
}
const allowedSiteKeys = [
  "hero_eyebrow", "hero_title_1", "hero_title_2", "hero_title_accent",
  "hero_description", "about_description", "contact_whatsapp", "contact_email", "contact_address",
];

for (const name of ["GAS_ADMIN_WEB_APP_URL", "GAS_ADMIN_SECRET"]) {
  if (!process.env[name]?.trim()) throw new Error("Environment variable " + name + " is required.");
}

function approvedGasUrl(raw) {
  const url = new URL(raw);
  if (url.protocol !== "https:" || url.hostname !== "script.google.com" || !url.pathname.endsWith("/exec")) {
    throw new Error("Legacy admin GAS URL must be an HTTPS script.google.com /exec deployment.");
  }
  return url;
}
function plain(value) { return Boolean(value) && typeof value === "object" && !Array.isArray(value); }
function cleanString(value, max = 600) {
  if (typeof value !== "string") return "";
  return value.normalize("NFKC").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}
function validMediaUrl(value) {
  if (typeof value !== "string" || value.length > 1000) return false;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.username || url.password || url.port) return false;
    if (url.hostname === "images.unsplash.com") return /^\/photo-[\w-]+/.test(url.pathname);
    if (url.hostname === "drive.google.com" && url.pathname === "/thumbnail") {
      return /^[\w-]{15,120}$/.test(url.searchParams.get("id") || "");
    }
    const bucket = process.env.FIREBASE_STORAGE_BUCKET?.trim() || "";
    if (url.hostname === "firebasestorage.googleapis.com" && bucket) {
      const match = url.pathname.match(/^\/v0\/b\/([^/]+)\/o\/(.+)$/);
      return Boolean(match && match[1] === bucket &&
        /^public-media\/[0-9a-f-]{36}\.(jpg|png|webp)$/i.test(decodeURIComponent(match[2])) &&
        url.searchParams.get("alt") === "media" &&
        /^[0-9a-f-]{36}$/i.test(url.searchParams.get("token") || ""));
    }
    return false;
  } catch { return false; }
}
function parsePublished(value) {
  return value === true || value === "true" || value === 1 || value === "1";
}
function parseOrder(value, fallback) {
  const order = Number(value);
  return Number.isInteger(order) && order >= 0 && order <= 9999 ? order : fallback;
}
function normalizeItems(raw, kind) {
  if (!Array.isArray(raw)) return { items: [], skipped: 0 };
  const seen = new Set();
  const result = [];
  let skipped = 0;
  for (let index = 0; index < raw.length; index += 1) {
    const value = raw[index];
    if (!plain(value)) { skipped += 1; continue; }
    const id = cleanString(value.id, 80);
    const title = cleanString(value.title, 160);
    const category = cleanString(value.category, 100);
    const image = cleanString(value.image_url, 1000);
    const published = parsePublished(value.published);
    if (!/^[A-Za-z0-9-]{3,80}$/.test(id) || seen.has(id) || !title || !category ||
        (image && !validMediaUrl(image)) || (published && !image)) {
      skipped += 1;
      continue;
    }
    seen.add(id);
    const record = {
      id, title, category, image_url: image,
      published,
      order: parseOrder(value.order, index),
    };
    if (kind === "programs") {
      record.description = cleanString(value.description, 600);
      record.duration = cleanString(value.duration, 100);
    }
    result.push(record);
  }
  result.sort((a, b) => a.order - b.order);
  return { items: result, skipped };
}
function normalizePayload(raw) {
  if (!plain(raw) || !plain(raw.site)) throw new Error("Admin GAS returned an invalid CMS structure.");
  const site = {};
  for (const key of allowedSiteKeys) {
    if (typeof raw.site[key] === "string") site[key] = cleanString(raw.site[key], 600);
  }
  const programs = normalizeItems(raw.programs, "programs");
  const gallery = normalizeItems(raw.gallery, "gallery");
  return {
    site,
    programs: programs.items,
    gallery: gallery.items,
    skippedPrograms: programs.skipped,
    skippedGallery: gallery.skipped,
  };
}
async function readLegacyCms() {
  const url = approvedGasUrl(process.env.GAS_ADMIN_WEB_APP_URL.trim());
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "text/plain;charset=utf-8" },
    body: JSON.stringify({ action: "read_content", secret: process.env.GAS_ADMIN_SECRET.trim() }),
    cache: "no-store",
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) throw new Error("Legacy GAS returned HTTP " + response.status + ".");
  const body = await response.json();
  if (body?.ok !== true || !plain(body.data)) throw new Error("Legacy GAS rejected the CMS export or returned invalid JSON.");
  return normalizePayload(body.data);
}
function b64url(value) { return Buffer.from(value, "utf8").toString("base64url"); }
async function getAccessToken() {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim() || "";
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim() || "";
  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, "\n").trim();
  if (!/^[a-z0-9][a-z0-9-]{4,61}[a-z0-9]$/.test(projectId) ||
      !/^[^@\s]+@[^@\s]+\.iam\.gserviceaccount\.com$/.test(clientEmail) ||
      !privateKey.includes("-----BEGIN PRIVATE KEY-----")) {
    throw new Error("FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY are required for --apply.");
  }
  const endpoint = "https://oauth2.googleapis.com/token";
  const now = Math.floor(Date.now() / 1000);
  const unsigned = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" })) + "." +
    b64url(JSON.stringify({
      iss: clientEmail, scope: "https://www.googleapis.com/auth/datastore",
      aud: endpoint, iat: now, exp: now + 3600,
    }));
  const signer = createSign("RSA-SHA256");
  signer.update(unsigned);
  signer.end();
  const assertion = unsigned + "." + signer.sign(privateKey).toString("base64url");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error("Firebase service-account authentication failed.");
  const data = await response.json();
  if (typeof data.access_token !== "string") throw new Error("Google did not return an access token.");
  return { accessToken: data.access_token, projectId };
}
function encodeValue(value) {
  if (value === null || typeof value === "undefined") return { nullValue: null };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return { nullValue: null };
    return Number.isSafeInteger(value) ? { integerValue: String(value) } : { doubleValue: value };
  }
  if (Array.isArray(value)) return { arrayValue: { values: value.map(encodeValue) } };
  if (plain(value)) return { mapValue: { fields: encodeFields(value) } };
  return { stringValue: String(value) };
}
function encodeFields(value) {
  const result = {};
  for (const [key, item] of Object.entries(value)) result[key] = encodeValue(item);
  return result;
}
async function upsertDocument(accessToken, projectId, collection, id, data) {
  const name = "projects/" + projectId + "/databases/(default)/documents/" + collection + "/" + id;
  const url = new URL("https://firestore.googleapis.com/v1/" + name);
  for (const key of Object.keys(data)) url.searchParams.append("updateMask.fieldPaths", key);
  const response = await fetch(url, {
    method: "PATCH",
    headers: { Authorization: "Bearer " + accessToken, "Content-Type": "application/json" },
    body: JSON.stringify({ name, fields: encodeFields(data) }),
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) {
    await response.arrayBuffer().catch(() => undefined);
    throw new Error("Firestore upsert failed for " + collection + "/" + id + " (HTTP " + response.status + ").");
  }
}
async function main() {
  const payload = await readLegacyCms();
  const summary = {
    mode: apply ? "APPLY" : "DRY RUN",
    selectedForWrite: selected,
    siteFields: Object.keys(payload.site).length,
    programs: payload.programs.length,
    gallery: payload.gallery.length,
    skippedPrograms: payload.skippedPrograms,
    skippedGallery: payload.skippedGallery,
  };
  console.log(JSON.stringify(summary, null, 2));
  console.log("Legacy CMS preview — verify this information belongs on the Sinergi Global website:");
  console.log(JSON.stringify({
    site: payload.site,
    programs: payload.programs.map(({ id, title, category, published, image_url }) => ({ id, title, category, published, hasApprovedImage: Boolean(image_url) })),
    gallery: payload.gallery.map(({ id, title, category, published, image_url }) => ({ id, title, category, published, hasApprovedImage: Boolean(image_url) })),
  }, null, 2));
  if (!apply) {
    console.log("Dry run only. No Firebase writes were made. Review the preview and select only appropriate collections with --apply.");
    return;
  }
  const { accessToken, projectId } = await getAccessToken();
  if (selected.site) {
    const site = { ...payload.site, migrated_at: new Date().toISOString(), migration_source: "legacy_gas_cms" };
    await upsertDocument(accessToken, projectId, "site_content", "public", site);
  }
  if (selected.programs) {
    for (const item of payload.programs) await upsertDocument(accessToken, projectId, "programs", item.id, item);
  }
  if (selected.gallery) {
    for (const item of payload.gallery) await upsertDocument(accessToken, projectId, "gallery", item.id, item);
  }
  console.log("Selected CMS migration finished. Verify Firestore counts, published/draft state and public images in Preview.");
}
main().catch(error => {
  console.error("CMS migration failed:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
});
