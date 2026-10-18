import { createHmac, randomBytes, timingSafeEqual, webcrypto } from "node:crypto";
import { cookies } from "next/headers";

export const SESSION_COOKIE = "synergy_admin_session";
export const NONCE_COOKIE = "synergy_admin_nonce";
export const SESSION_SECONDS = 60 * 60 * 8;

type Session = { email: string; sub: string; exp: number; iat: number };

export function allowedEmails(): string[] {
  return (process.env.ADMIN_ALLOWED_EMAILS ?? "").split(",").map(x => x.trim().toLowerCase()).filter(Boolean);
}

function sessionKey(): string {
  const secret = process.env.ADMIN_SESSION_SECRET ?? "";
  if (secret.length < 32) throw new Error("ADMIN_SESSION_SECRET harus minimal 32 karakter.");
  return secret;
}

export function createSessionToken(email: string, sub: string): string {
  const iat = Math.floor(Date.now() / 1000);
  const data: Session = { email, sub, iat, exp: iat + SESSION_SECONDS };
  const raw = Buffer.from(JSON.stringify(data)).toString("base64url");
  const signature = createHmac("sha256", sessionKey()).update(raw).digest("base64url");
  return `${raw}.${signature}`;
}

export function verifySessionToken(token?: string): Session | null {
  try {
    if (!token || !token.includes(".")) return null;
    const parts = token.split(".");
    if (parts.length !== 2) return null;
    const [body, mac] = parts;
    const expected = createHmac("sha256", sessionKey()).update(body).digest();
    const actual = Buffer.from(mac, "base64url");
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    const parsed = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as Partial<Session>;
    if (typeof parsed.sub !== "string" || !parsed.sub || typeof parsed.email !== "string" ||
        typeof parsed.exp !== "number" || parsed.exp <= Date.now() / 1000) return null;
    if (!allowedEmails().includes(parsed.email.toLowerCase())) return null;
    return parsed as Session;
  } catch { return null; }
}

export async function getAdminSession(): Promise<Session | null> {
  const jar = await cookies();
  return verifySessionToken(jar.get(SESSION_COOKIE)?.value);
}

export function newNonce(): string { return randomBytes(32).toString("base64url"); }

function decodeB64Json(encoded: string): Record<string, unknown> {
  return JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as Record<string, unknown>;
}

type Jwk = JsonWebKey & { kid?: string; alg?: string; use?: string };

/** Validasi ID token Google melalui sertifikat JWKS resmi; tidak mempercayai klaim tanpa verifikasi tanda tangan. */
export async function verifyGoogleCredential(idToken: string, nonce: string): Promise<{ email: string; sub: string }> {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  if (!clientId) throw new Error("GOOGLE_CLIENT_ID belum diatur.");
  if (idToken.length > 16000) throw new Error("Token terlalu panjang.");
  const pieces = idToken.split(".");
  if (pieces.length !== 3) throw new Error("Format Google ID token tidak valid.");
  const [head, body, signature] = pieces;
  const header = decodeB64Json(head);
  const payload = decodeB64Json(body);
  if (header.alg !== "RS256" || typeof header.kid !== "string" || header.kid.length > 128) throw new Error("Algoritme token tidak sah.");
  const now = Math.floor(Date.now() / 1000);
  if (payload.aud !== clientId || !["accounts.google.com", "https://accounts.google.com"].includes(String(payload.iss)) ||
      typeof payload.exp !== "number" || payload.exp <= now ||
      typeof payload.iat !== "number" || payload.iat > now + 300 ||
      typeof payload.nonce !== "string" || payload.nonce !== nonce ||
      payload.email_verified !== true || typeof payload.email !== "string" || typeof payload.sub !== "string") {
    throw new Error("Klaim ID token tidak memenuhi syarat.");
  }
  const email = payload.email.toLowerCase();
  // Google isn't authoritative for non-Gmail accounts without a hosted-domain claim.
  if (!email.endsWith("@gmail.com") && (typeof payload.hd !== "string" || !payload.hd)) {
    throw new Error("Gunakan akun Gmail atau Google Workspace yang terverifikasi.");
  }
  if (!allowedEmails().includes(email)) throw new Error("Akun Google ini tidak terdaftar sebagai admin.");
  const jwksResponse = await fetch("https://www.googleapis.com/oauth2/v3/certs", {
    cache: "no-store", signal: AbortSignal.timeout(8000),
  });
  if (!jwksResponse.ok) throw new Error("Tidak dapat menghubungi Google untuk verifikasi token.");
  const jwks = await jwksResponse.json() as { keys?: Jwk[] };
  const key = jwks.keys?.find(item => item.kid === header.kid && item.kty === "RSA" && (item.use === "sig" || !item.use));
  if (!key) throw new Error("Sertifikat tanda tangan Google tidak ditemukan.");
  const imported = await webcrypto.subtle.importKey("jwk", key, { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }, false, ["verify"]);
  const verified = await webcrypto.subtle.verify("RSASSA-PKCS1-v1_5", imported,
    new Uint8Array(Buffer.from(signature, "base64url")), new TextEncoder().encode(`${head}.${body}`));
  if (!verified) throw new Error("Tanda tangan ID token tidak valid.");
  return { email, sub: payload.sub };
}

export const cookieSettings = {
  httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/",
};

export function sameOrigin(req: Request): boolean {
  const origin = req.headers.get("origin");
  if (!origin) return false;
  try { return new URL(origin).host === new URL(req.url).host && new URL(origin).protocol === new URL(req.url).protocol; }
  catch { return false; }
}
