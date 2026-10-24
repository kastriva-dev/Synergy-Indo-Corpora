import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

type RedisConfig = { baseUrl: string; token: string };

export type RateLimitResult = {
  allowed: boolean;
  retryAfter: number;
  unavailable?: boolean;
};

type LocalBucket = { count: number; resetAt: number };

const localBuckets = new Map<string, LocalBucket>();
const localNonces = new Map<string, number>();

const INCREMENT_SCRIPT = [
  "local count = redis.call('INCR', KEYS[1])",
  "if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end",
  "local ttl = redis.call('TTL', KEYS[1])",
  "return {count, ttl}",
].join("; ");

function digest(value: string): string {
  return createHash("sha256").update(value).digest("hex").slice(0, 40);
}

function environmentNamespace(): string {
  const vercelEnvironment = process.env.VERCEL_ENV;
  if (vercelEnvironment === "production" || vercelEnvironment === "preview") {
    return vercelEnvironment;
  }
  return process.env.NODE_ENV === "production" ? "production" : "development";
}

function getRedisConfig(): RedisConfig | null {
  // Vercel's Upstash Marketplace connection prefixes the provider's
  // KV_REST_API_* variables with the configured project prefix.
  const rawUrl = (
    process.env.UPSTASH_REDIS_REST_URL ??
    process.env.UPSTASH_REDIS_REST_KV_REST_API_URL
  )?.trim();
  const token = (
    process.env.UPSTASH_REDIS_REST_TOKEN ??
    process.env.UPSTASH_REDIS_REST_KV_REST_API_TOKEN
  )?.trim();

  if (!rawUrl && !token) return null;
  if (!rawUrl || !token) throw new Error("Upstash environment variables are incomplete.");

  const parsed = new URL(rawUrl);
  if (
    parsed.protocol !== "https:" ||
    !parsed.hostname.endsWith(".upstash.io") ||
    parsed.username ||
    parsed.password ||
    (parsed.pathname !== "" && parsed.pathname !== "/") ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error("Invalid Upstash REST URL.");
  }

  return { baseUrl: parsed.origin, token };
}

async function redisCommand(config: RedisConfig, args: string[]): Promise<unknown> {
  const url = `${config.baseUrl}/${args.map(part => encodeURIComponent(part)).join("/")}`;
  const response = await fetch(url, {
    method: "GET",
    headers: { Authorization: `Bearer ${config.token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(3000),
  });

  if (!response.ok) throw new Error("Upstash request failed.");
  const payload = await response.json() as { result?: unknown; error?: string };
  if (payload.error) throw new Error("Upstash command failed.");
  return payload.result;
}

function clientAddress(request: Request): string {
  // Vercel supplies x-real-ip. x-forwarded-for is a fallback for local/proxy setups.
  const realIp = request.headers.get("x-real-ip")?.trim();
  const forwardedIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const candidate = realIp || forwardedIp || "unknown";
  return candidate.length <= 128 ? candidate : "unknown";
}

function localIncrement(key: string, limit: number, windowSeconds: number): RateLimitResult {
  const now = Date.now();
  if (localBuckets.size > 2000) {
    for (const [storedKey, bucket] of localBuckets) {
      if (bucket.resetAt <= now) localBuckets.delete(storedKey);
    }
  }

  let bucket = localBuckets.get(key);
  if (!bucket || bucket.resetAt <= now) {
    bucket = { count: 0, resetAt: now + windowSeconds * 1000 };
  }
  bucket.count += 1;
  localBuckets.set(key, bucket);

  return {
    allowed: bucket.count <= limit,
    retryAfter: Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)),
  };
}

/**
 * Distributed fixed-window limits using Upstash Redis in production.
 * An in-memory fallback is deliberately restricted to non-production development.
 */
export async function checkRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowSeconds: number,
  identity?: string,
): Promise<RateLimitResult> {
  const safeScope = /^[a-z0-9_-]{1,40}$/i.test(scope) ? scope : "unknown";
  const namespace = environmentNamespace();
  const keys = [
    `synergy:${namespace}:rl:${safeScope}:ip:${digest(clientAddress(request))}`,
  ];
  if (identity?.trim()) {
    keys.push(`synergy:${namespace}:rl:${safeScope}:admin:${digest(identity.trim().toLowerCase())}`);
  }

  let config: RedisConfig | null;
  try {
    config = getRedisConfig();
  } catch {
    return { allowed: false, retryAfter: 30, unavailable: true };
  }

  if (!config) {
    if (process.env.NODE_ENV === "production") {
      return { allowed: false, retryAfter: 30, unavailable: true };
    }

    let result: RateLimitResult = { allowed: true, retryAfter: windowSeconds };
    for (const key of keys) {
      const current = localIncrement(key, limit, windowSeconds);
      if (!current.allowed) result = current;
    }
    return result;
  }

  try {
    let result: RateLimitResult = { allowed: true, retryAfter: windowSeconds };
    for (const key of keys) {
      const response = await redisCommand(config, [
        "EVAL",
        INCREMENT_SCRIPT,
        "1",
        key,
        String(windowSeconds),
      ]);
      if (!Array.isArray(response) || response.length < 2) {
        throw new Error("Unexpected Upstash rate-limit response.");
      }
      const count = Number(response[0]);
      const ttl = Number(response[1]);
      if (!Number.isFinite(count) || !Number.isFinite(ttl)) {
        throw new Error("Invalid Upstash rate-limit response.");
      }
      if (count > limit) {
        result = { allowed: false, retryAfter: Math.max(1, ttl) };
      }
    }
    return result;
  } catch {
    // Fail closed: do not silently disable protection if the distributed limiter fails.
    return { allowed: false, retryAfter: 30, unavailable: true };
  }
}

export function rateLimitResponse(result: RateLimitResult): NextResponse | null {
  if (result.allowed) return null;
  const unavailable = Boolean(result.unavailable);
  return NextResponse.json(
    {
      error: unavailable
        ? "Kontrol keamanan sementara tidak tersedia. Coba lagi nanti."
        : "Terlalu banyak permintaan. Tunggu sebentar lalu coba lagi.",
    },
    {
      status: unavailable ? 503 : 429,
      headers: {
        "Cache-Control": "no-store",
        "Retry-After": String(Math.max(1, result.retryAfter)),
      },
    },
  );
}

export type NonceConsumption = "consumed" | "replayed" | "unavailable";

/** Atomically marks a login nonce as used so concurrent/replayed login requests cannot reuse it. */
export async function consumeLoginNonce(nonce: string): Promise<NonceConsumption> {
  const key = `synergy:${environmentNamespace()}:login-nonce:${digest(nonce)}`;
  let config: RedisConfig | null;

  try {
    config = getRedisConfig();
  } catch {
    return "unavailable";
  }

  if (!config) {
    if (process.env.NODE_ENV === "production") return "unavailable";
    const now = Date.now();
    if (localNonces.size > 2000) {
      for (const [storedKey, expiresAt] of localNonces) {
        if (expiresAt <= now) localNonces.delete(storedKey);
      }
    }
    const expiresAt = localNonces.get(key);
    if (expiresAt && expiresAt > now) return "replayed";
    localNonces.set(key, now + 300_000);
    return "consumed";
  }

  try {
    const result = await redisCommand(config, ["SET", key, "1", "NX", "EX", "300"]);
    if (result === "OK") return "consumed";
    if (result === null) return "replayed";
    return "unavailable";
  } catch {
    return "unavailable";
  }
}
