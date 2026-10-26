import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, NONCE_COOKIE, cookieSettings, createSessionToken, sameOrigin, verifyGoogleCredential, verifyFirebaseCredential, SESSION_SECONDS } from "@/lib/admin/auth";
import { checkRateLimit, rateLimitResponse, consumeLoginNonce } from "@/lib/admin/rate-limit";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origin tidak sah." }, { status: 403 });

  const blocked = rateLimitResponse(await checkRateLimit(request, "login", 8, 600));
  if (blocked) return blocked;

  const nonce = request.cookies.get(NONCE_COOKIE)?.value;
  if (!nonce) return NextResponse.json({ error: "Sesi login kedaluwarsa. Muat ulang halaman." }, { status: 400 });

  try {
    const raw = await request.text();
    if (raw.length > 20000) return NextResponse.json({ error: "Payload terlalu besar." }, { status: 413 });
    const body = JSON.parse(raw) as { credential?: string; firebaseCredential?: string };
    if (typeof body.credential !== "string" || typeof body.firebaseCredential !== "string") {
      return NextResponse.json({ error: "Kredensial Google dan Firebase diperlukan." }, { status: 400 });
    }
    const googleIdentity = await verifyGoogleCredential(body.credential, nonce);
    const firebaseIdentity = await verifyFirebaseCredential(body.firebaseCredential, googleIdentity.email);
    const email = googleIdentity.email;
    const sub = firebaseIdentity.uid;
    const nonceResult = await consumeLoginNonce(nonce);
    if (nonceResult === "unavailable") {
      return NextResponse.json({ error: "Kontrol keamanan sementara tidak tersedia. Coba lagi nanti." }, { status: 503 });
    }
    if (nonceResult === "replayed") {
      return NextResponse.json({ error: "Permintaan login sudah digunakan. Muat ulang halaman." }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true, email }, { headers: { "Cache-Control": "no-store" } });
    res.cookies.set(SESSION_COOKIE, createSessionToken(email, sub), { ...cookieSettings, maxAge: SESSION_SECONDS });
    res.cookies.delete(NONCE_COOKIE);
    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Login gagal.";
    return NextResponse.json({ error: message }, { status: 401 });
  }
}
