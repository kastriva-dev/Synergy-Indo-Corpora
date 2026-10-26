import { redirect } from "next/navigation";
import { getPublicContent } from "@/lib/content";
import { getAdminSession } from "@/lib/admin/auth";
import { isFirebaseConfigured } from "@/lib/firebase/server";
import AdminDashboard from "@/components/admin/AdminDashboard";

export const dynamic = "force-dynamic";
export default async function AdminPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const content = await getPublicContent();
  return <AdminDashboard email={session.email} initial={content} backendReady={isFirebaseConfigured()} />;
}
