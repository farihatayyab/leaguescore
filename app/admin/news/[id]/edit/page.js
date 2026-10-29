import { notFound } from "next/navigation";
import { adminArticle, getCategories } from "@/lib/news";
import NewsForm from "@/components/admin/NewsForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Edit news" };

export default async function EditNews({ params }) {
  const { id } = await params;
  const [article, cats] = await Promise.all([adminArticle(id), getCategories()]);
  if (!article) notFound();
  return <NewsForm key={article.id} cats={cats} article={article} />;
}