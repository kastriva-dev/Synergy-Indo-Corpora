import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/auth";
import GoogleLogin from "@/components/admin/GoogleLogin";

export const dynamic = "force-dynamic";
export default async function AdminLoginPage() {
  if (await getAdminSession()) redirect("/admin");
  return <GoogleLogin clientId={process.env.GOOGLE_CLIENT_ID ?? ""} firebaseApiKey={process.env.FIREBASE_WEB_API_KEY ?? ""} />;
}
