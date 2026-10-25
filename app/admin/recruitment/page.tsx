import { redirect } from "next/navigation";
import { getAdminSession } from "@/lib/admin/auth";
import RecruitmentAdmin from "@/components/admin/RecruitmentAdmin";

export const dynamic = "force-dynamic";

export default async function AdminRecruitmentPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  return <RecruitmentAdmin />;
}
