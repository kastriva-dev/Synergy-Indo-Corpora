import { NextRequest, NextResponse } from "next/server";
import { NONCE_COOKIE, cookieSettings, newNonce } from "@/lib/admin/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/admin/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const blocked = rateLimitResponse(await checkRateLimit(request, "nonce", 30, 60));
  if (blocked) return blocked;

  const value = newNonce();
  const res = NextResponse.json({ nonce: value }, { headers: { "Cache-Control": "no-store" } });
  res.cookies.set(NONCE_COOKIE, value, { ...cookieSettings, maxAge: 300 });
  return res;
}
