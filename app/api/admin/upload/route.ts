import { NextRequest, NextResponse } from "next/server";
import { getAdminSession, sameOrigin } from "@/lib/admin/auth";
import { checkRateLimit, rateLimitResponse } from "@/lib/admin/rate-limit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX = 2_200_000;

export async function POST(request: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({error:"Login admin diperlukan."},{status:401});
  if (!sameOrigin(request)) return NextResponse.json({error:"Origin ditolak."},{status:403});

  const blocked = rateLimitResponse(await checkRateLimit(request, "upload", 12, 600, session.email));
  if (blocked) return blocked;

  const contentType = request.headers.get("content-type") || "";
  if (!/^multipart\/form-data(?:;|$)/i.test(contentType)) return NextResponse.json({error:"Upload harus menggunakan multipart/form-data."},{status:415});
  const len = Number(request.headers.get("content-length") || 0);
  if (len > 3_100_000) return NextResponse.json({error:"Ukuran file terlalu besar."},{status:413});
  try {
    const form = await request.formData();
    if (Array.from(form.keys()).some(k=>k!=="image") || form.getAll("image").length !== 1) return NextResponse.json({error:"Permintaan upload tidak valid."},{status:400});
    const file = form.get("image");
    if (!(file instanceof File) || file.size < 1 || file.size > MAX || !["image/jpeg","image/png","image/webp"].includes(file.type))
      return NextResponse.json({error:"Gunakan JPG, PNG atau WEBP maksimal 2,2 MB."},{status:400});
    const bytes = Buffer.from(await file.arrayBuffer());
    const isJpg = bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff;
    const isPng = bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const isWebp = bytes.toString("ascii",0,4)==="RIFF" && bytes.toString("ascii",8,12)==="WEBP";
    if (!((file.type==="image/jpeg"&&isJpg)||(file.type==="image/png"&&isPng)||(file.type==="image/webp"&&isWebp)))
      return NextResponse.json({error:"Isi gambar tidak sesuai format."},{status:400});
    const url = process.env.GAS_ADMIN_WEB_APP_URL?.trim();
    const secret = process.env.GAS_ADMIN_SECRET?.trim();
    if (!url || !secret || secret.length<32) throw new Error("not configured");
    const target = new URL(url);
    if (target.protocol!=="https:" || target.hostname!=="script.google.com" || !target.pathname.endsWith("/exec")) throw new Error("invalid target");
    const upstream = await fetch(target.toString(), {method:"POST",headers:{"Content-Type":"text/plain;charset=utf-8"}, body:JSON.stringify({action:"upload_image",secret,data:{mime_type:file.type,base64:bytes.toString("base64")}}),signal:AbortSignal.timeout(30000),cache:"no-store"});
    if (!upstream.ok) throw new Error("upstream");
    const result = await upstream.json() as {ok?:boolean;image_url?:string};
    if (!result.ok || !result.image_url || !/^https:\/\/drive\.google\.com\/thumbnail\?/.test(result.image_url)) throw new Error("upload rejected");
    return NextResponse.json({ok:true,image_url:result.image_url},{headers:{"Cache-Control":"no-store"}});
  } catch { return NextResponse.json({error:"Upload ke Google Drive gagal. Periksa izin Drive, deployment GAS, dan ukuran file."},{status:502}); }
}
