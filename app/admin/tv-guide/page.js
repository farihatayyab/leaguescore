import { listSources } from "@/lib/tvguide";
import TvGuideManager from "@/components/admin/TvGuideManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "TV Guide" };

export default async function AdminTvGuide() {
  const sources = await listSources();
  return <TvGuideManager sources={sources} />;
}
