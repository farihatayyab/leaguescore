import { adminArticles, getCategories } from "@/lib/news";
import CategoriesManager from "@/components/admin/CategoriesManager";

export const dynamic = "force-dynamic";
export const metadata = { title: "Categories" };

export default async function AdminCategories() {
  const [cats, articles] = await Promise.all([getCategories(), adminArticles()]);
  const counts = Object.fromEntries(cats.map((c) => [c.id, articles.filter((a) => a.category_id === c.id).length]));
  return <CategoriesManager cats={cats} counts={counts} />;
}