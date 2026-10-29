import { getCategories } from "@/lib/news";
import NewsForm from "@/components/admin/NewsForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Add news" };

export default async function NewNews({ searchParams }) {
  const { cat = "" } = await searchParams;
  const cats = await getCategories();
  return <NewsForm cats={cats} defaultCat={cat} />;
}