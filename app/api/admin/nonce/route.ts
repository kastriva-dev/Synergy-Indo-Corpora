import { NextResponse } from "next/server";
import { NONCE_COOKIE, cookieSettings, newNonce } from "@/lib/admin/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const value = newNonce();
  const res = NextResponse.json({ nonce: value }, { headers: { "Cache-Control": "no-store" } });
  res.cookies.set(NONCE_COOKIE, value, { ...cookieSettings, maxAge: 300 });
  return res;
}
