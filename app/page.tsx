import { getPublicContent } from "@/lib/content";
import PremiumHome from "@/components/PremiumHome";

export const revalidate = 300;

export default async function Page() {
  const content = await getPublicContent();
  return <PremiumHome content={content} />;
}
