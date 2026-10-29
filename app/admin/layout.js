import Link from "next/link";
import { getAdmin } from "@/lib/admin";
import AdminSidebar from "@/components/admin/AdminSidebar";

export const dynamic = "force-dynamic";
export const metadata = { title: { default: "Admin", template: "%s | Admin" } };

export default async function AdminLayout({ children }) {
  const admin = await getAdmin();

  if (!admin) {
    return (
      <div className="adm-denied">
        <div className="adm-panel adm-panel-b">
          <h2>Admin access only</h2>
          <p className="muted" style={{ margin: "10px 0 18px" }}>
            Pehle website par “Connect” se login karo. Aapki email .env.local ke ADMIN_EMAILS me honi chahiye.
          </p>
          <Link href="/" className="adm-btn">← Back to website</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="adm">
      <AdminSidebar admin={admin} />
      <div className="adm-content">{children}</div>
    </div>
  );
}