import Link from "next/link";
import { getT } from "@/lib/i18n-server";

export default async function NotFound() {
  const { t } = await getT();
  return (
    <div className="panel empty-state">
      <h1>{t("nf.title")}</h1>
      <p className="muted">{t("nf.text")}</p>
      <Link href="/football" className="btn-grad inline">{t("nf.back")}</Link>
    </div>
  );
}
