import { getPublicContent } from "@/lib/content";
import PremiumHome from "@/components/PremiumHome";
import { checkRecruitmentServiceReady, getPublishedJobs, publicPrivacyNoticeVersion, type RecruitmentJob } from "@/lib/recruitment/store";

export const dynamic = "force-dynamic";

export default async function Page() {
  const content = await getPublicContent();
  let jobs: RecruitmentJob[] = [];
  let recruitmentReady = false;
  try {
    recruitmentReady = content.source !== "demo" && await checkRecruitmentServiceReady();
    jobs = await getPublishedJobs();
  } catch {
    jobs = [];
    recruitmentReady = false;
  }
  return <PremiumHome content={content} jobs={jobs} recruitmentReady={recruitmentReady} privacyNoticeVersion={publicPrivacyNoticeVersion()} />;
}
