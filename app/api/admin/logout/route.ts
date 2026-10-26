import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, sameOrigin } from "@/lib/admin/auth";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origin tidak sah." }, { status: 403 });
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(SESSION_COOKIE);
  return res;
}
