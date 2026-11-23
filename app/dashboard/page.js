import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";
export const metadata = { title: "My dashboard", robots: { index: false, follow: false } };

export default async function UserDashboard() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const since = user.created_at ? new Date(user.created_at).toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" }) : "";

  return (
    <>
      <div className="page-head">
        <h1>Welcome, {user.name.split(" ")[0]}</h1>
      </div>

      <div className="user-dash">
        <section className="dash-card">
          <h2>Your account</h2>
          <dl>
            <dt>Name</dt><dd>{user.name}</dd>
            <dt>Email</dt><dd>{user.email}</dd>
            <dt>Account type</dt><dd><span className="role-pill">{user.role === "admin" ? "Administrator" : "User"}</span></dd>
            {since && (<><dt>Member since</dt><dd>{since}</dd></>)}
          </dl>
        </section>

        <section className="dash-card">
          <h2>Quick links</h2>
          <ul>
            <li><Link href="/football">Live scores</Link></li>
            <li><Link href="/news">News</Link></li>
            <li><Link href="/tv-guide">TV guide</Link></li>
            <li><Link href="/feedback">Send feedback</Link></li>
            {user.role === "admin" && <li><Link href="/admin"><b>Go to Admin Dashboard →</b></Link></li>}
          </ul>
        </section>
      </div>
    </>
  );
}
