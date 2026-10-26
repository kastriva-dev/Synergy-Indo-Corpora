import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, sameOrigin } from "@/lib/admin/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/admin/rate-limit";
import { isFirebaseConfigured, uploadPublicMedia } from "@/lib/firebase/server";
import {
  readRequestBodyLimited,
  RequestBodyTooLargeError,
} from "@/lib/http/read-request-body-limited";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX = 2_200_000;
const MAX_REQUEST = 3_100_000;

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Login admin diperlukan." }, { status: 401 });
  if (!sameOrigin(request)) return NextResponse.json({ error: "Origin ditolak." }, { status: 403 });
  if (!isFirebaseConfigured()) return NextResponse.json({ error: "Firebase Storage belum dikonfigurasi." }, { status: 503 });

  const blocked = rateLimitResponse(await checkRateLimit(request, "upload", 12, 600, session.email));
  if (blocked) return blocked;
  const contentType = request.headers.get("content-type") || "";
  if (!/^multipart\/form-data(?:;|$)/i.test(contentType)) return NextResponse.json({ error: "Upload harus menggunakan multipart/form-data." }, { status: 415 });
  const len = Number(request.headers.get("content-length") || 0);
  if (len > MAX_REQUEST) return NextResponse.json({ error: "Ukuran file terlalu besar." }, { status: 413 });

  let rawBody: Buffer;
  try {
    rawBody = await readRequestBodyLimited(request, MAX_REQUEST);
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "Ukuran file terlalu besar." }, { status: 413, headers: { "Cache-Control": "no-store" } });
    }
    return NextResponse.json({ error: "Isi permintaan upload tidak valid." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  let form: FormData;
  try {
    const boundedRequest = new Request(request.url, {
      method: "POST",
      headers: { "content-type": contentType },
      body: new Uint8Array(rawBody),
    });
    form = await boundedRequest.formData();
  } catch {
    return NextResponse.json({ error: "Form upload tidak valid." }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  if (Array.from(form.keys()).some(key => key !== "image") || form.getAll("image").length !== 1) {
    return NextResponse.json({ error: "Permintaan upload tidak valid." }, { status: 400 });
  }
  const file = form.get("image");
  if (!(file instanceof File) || file.size < 1 || file.size > MAX ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return NextResponse.json({ error: "Gunakan JPG, PNG atau WEBP maksimal 2,2 MB." }, { status: 400 });
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const jpg = bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  const png = bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const webp = bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP";
  if (!((file.type === "image/jpeg" && jpg) || (file.type === "image/png" && png) ||
        (file.type === "image/webp" && webp))) {
    return NextResponse.json({ error: "Isi gambar tidak sesuai format." }, { status: 400 });
  }

  try {
    const imageUrl = await uploadPublicMedia(bytes, file.type);
    return NextResponse.json({ ok: true, image_url: imageUrl }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "Upload gambar ke Firebase Storage gagal. Periksa bucket, IAM dan billing." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
}
