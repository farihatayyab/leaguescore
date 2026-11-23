import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import AdminSidebar from "@/components/admin/AdminSidebar";

export const dynamic = "force-dynamic";
export const metadata = { title: { default: "Admin", template: "%s | Admin" } };

export default async function AdminLayout({ children }) {
  const user = await getCurrentUser();

  // Login nahi -> login; login hai magar role "admin" nahi -> apna User Dashboard
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/dashboard");

  return (
    <div className="adm">
      <AdminSidebar admin={user} />
      <div className="adm-content">{children}</div>
    </div>
  );
}
