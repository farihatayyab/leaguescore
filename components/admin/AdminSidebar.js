"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";

const NAV = [
  {
    label: "Overview",
    items: [{ href: "/admin", text: "Dashboard", icon: "dash", exact: true }],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/news", text: "All news", icon: "news", on: (p) => p === "/admin/news" || /^\/admin\/news\/\d+\/edit/.test(p) },
      { href: "/admin/news/new", text: "Add news", icon: "plus", exact: true },
      { href: "/admin/categories", text: "Categories / Subnavbar", icon: "tag" },
    ],
  },
];

export default function AdminSidebar({ admin }) {
  const path = usePathname() || "";
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);

  const active = (it) => (it.on ? it.on(path) : it.exact ? path === it.href : path.startsWith(it.href));

  return (
    <>
      <header className="adm-top">
        <button className="adm-icon-btn" onClick={() => setOpen(true)} aria-label="Open menu">
          <Icon name="menu" />
        </button>
        <b>League<span>Score</span> Admin</b>
      </header>
      {open && <div className="adm-overlay" onClick={() => setOpen(false)} />}

      <aside className={`adm-side${open ? " open" : ""}`}>
        <div className="adm-brand">
          <span>League<b>Score</b></span>
          <small>Admin</small>
          <button className="adm-icon-btn adm-close" onClick={() => setOpen(false)} aria-label="Close menu">
            <Icon name="x" />
          </button>
        </div>

        <nav className="adm-nav">
          {NAV.map((g) => (
            <div key={g.label}>
              <div className="adm-nav-label">{g.label}</div>
              {g.items.map((it) => (
                <Link key={it.href} href={it.href} className={active(it) ? "on" : ""}>
                  <Icon name={it.icon} /> {it.text}
                </Link>
              ))}
            </div>
          ))}
          <div className="adm-nav-label">Website</div>
          <Link href="/news" target="_blank"><Icon name="link" /> View news page</Link>
          <Link href="/news/all" target="_blank"><Icon name="link" /> All news &amp; categories</Link>
        </nav>

        <div className="adm-user">
          <div className="adm-avatar">{(admin.name || admin.email || "A").trim()[0].toUpperCase()}</div>
          <div>
            <b>{admin.name || "Admin"}</b>
            <small>{admin.email}</small>
          </div>
        </div>
      </aside>
    </>
  );
}