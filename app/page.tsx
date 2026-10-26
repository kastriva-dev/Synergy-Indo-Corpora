import { getPublicContent } from "@/lib/content";
import PremiumHome from "@/components/PremiumHome";
import { checkRecruitmentServiceReady, getPublishedJobs, publicPrivacyNoticeVersion, type RecruitmentJob } from "@/lib/recruitment/store";

export const dynamic = "force-dynamic";

export default async function Page() {
  const content = await getPublicContent();
  let jobs: RecruitmentJob[] = [];
  let recruitmentReady = false;
  try {
    // Candidate intake remains Firebase-only; GAS is strictly read-only CMS for the meeting.
    recruitmentReady = content.source === "firebase" && await checkRecruitmentServiceReady();
    if (content.source === "firebase") jobs = await getPublishedJobs();
  } catch {
    jobs = [];
    recruitmentReady = false;
  }
  return <PremiumHome content={content} jobs={jobs} recruitmentReady={recruitmentReady} privacyNoticeVersion={publicPrivacyNoticeVersion()} />;
}
