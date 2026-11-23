import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { homeFor } from "@/lib/roles";
import AuthForm from "@/components/AuthForm";
import { getT } from "@/lib/i18n-server";

export const dynamic = "force-dynamic";
export const metadata = { title: "Log in", robots: { index: false, follow: false } };

export default async function Page({ searchParams }) {
  const user = await getCurrentUser().catch(() => null);
  if (user) redirect(homeFor(user.role)); // pehle se logged in ho to apne dashboard par
  const { reset } = await searchParams;
  const { t } = await getT();
  return <AuthForm mode="login" notice={reset === "ok" ? t("connect.resetOk") : ""} />;
}
