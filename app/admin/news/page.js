import { adminArticles, getCategories } from "@/lib/news";
import NewsTable from "@/components/admin/NewsTable";

export const dynamic = "force-dynamic";
export const metadata = { title: "All news" };

export default async function AdminNews() {
  const [articles, cats] = await Promise.all([adminArticles(), getCategories()]);
  return <NewsTable articles={articles} cats={cats} />;
}