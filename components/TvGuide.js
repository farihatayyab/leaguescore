import Link from "next/link";
import Logo from "./TvLogo";
import { getT } from "@/lib/i18n-server";

export { Logo };

const qs = (params, keepFirst) => {
  const u = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== "" && v != null && !(k === "page" && v === 1 && !keepFirst)) u.set(k, String(v));
  const s = u.toString();
  return s ? `?${s}` : "";
};

// 1 … 4 5 [6] 7 8 … 20
function windowPages(page, pages) {
  const set = new Set([1, pages, page, page - 1, page + 1, page - 2, page + 2]);
  const list = [...set].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out = [];
  list.forEach((n, i) => {
    if (i && n - list[i - 1] > 1) out.push("gap" + n);
    out.push(n);
  });
  return out;
}

export async function Pager({ base, params = {}, page, pages, keepFirst = false, total, perPage }) {
  if (pages <= 1) return null;
  const { t } = await getT();
  const href = (n) => `${base}${qs({ ...params, page: n }, keepFirst)}`;
  const from = total ? (page - 1) * perPage + 1 : 0;
  const to = total ? Math.min(page * perPage, total) : 0;
  const Step = ({ n, off, label, children, rel }) =>
    off ? <span className="step off" aria-hidden="true">{children}</span>
        : <Link href={href(n)} className="step" rel={rel} aria-label={label}>{children}</Link>;

  return (
    <nav className="tv-pager" aria-label="Pagination">
      <div className="tv-pager-main">
        <Step n={1} off={page === 1} label={t("pg.first")}>«</Step>
        <Step n={page - 1} off={page === 1} label={t("pg.prevPage")} rel="prev">{t("pg.prev")}</Step>
        {windowPages(page, pages).map((n) =>
          typeof n === "string" ? (
            <span key={n} className="gap">…</span>
          ) : (
            <Link key={n} href={href(n)} className={n === page ? "on" : ""} aria-current={n === page ? "page" : undefined}>{n}</Link>
          )
        )}
        <Step n={page + 1} off={page === pages} label={t("pg.nextPage")} rel="next">{t("pg.next")}</Step>
        <Step n={pages} off={page === pages} label={t("pg.last")}>»</Step>
      </div>
      <div className="tv-pager-meta">
        <span>
          {total ? <>{t("pg.showing")} <b>{from}–{to}</b> {t("pg.of")} <b>{total}</b> · </> : null}{t("pg.page")} <b>{page}</b> {t("pg.of")} <b>{pages}</b>
        </span>
        <form action={base} className="tv-jump">
          {Object.entries(params).map(([k, v]) => (v !== "" && v != null && k !== "page" ? <input key={k} type="hidden" name={k} value={String(v)} /> : null))}
          <label htmlFor="tv-go">{t("pg.goTo")}</label>
          <input id="tv-go" name="page" type="number" min={1} max={pages} defaultValue={page} inputMode="numeric" />
          <button type="submit">{t("pg.go")}</button>
        </form>
      </div>
    </nav>
  );
}
