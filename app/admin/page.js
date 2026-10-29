import { getAdmin } from "@/lib/admin";
import { getCategories, adminArticles } from "@/lib/news";
import AdminPanel from "@/components/AdminPanel";

export const dynamic = "force-dynamic";
export const metadata = { title: "Admin" };

export default async function AdminPage() {
  const admin = await getAdmin();
  if (!admin) {
    return (
      <div className="panel pad">
        <h3>Admin access only</h3>
        <p className="muted" style={{ marginTop: 8 }}>
          Upar “Connect” se login karo. Aapki email .env.local ke ADMIN_EMAILS me honi chahiye.
        </p>
      </div>
    );
  }
  const [cats, articles] = await Promise.all([getCategories(), adminArticles()]);
  return <AdminPanel cats={cats} articles={articles} />;
}