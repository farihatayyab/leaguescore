"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useT } from "./LanguageProvider";

// Header ka button: logged-out -> /login page; logged-in -> apna dashboard + logout
export default function ConnectButton() {
  const t = useT();
  const [user, setUser] = useState(null);

  useEffect(() => {
    fetch("/api/auth/me").then((r) => r.json()).then((d) => setUser(d.user)).catch(() => {});
  }, []);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    setUser(null);
    window.location.assign("/");
  }

  if (user) {
    return (
      <span className="head-user">
        <Link className="btn-connect" href={user.home || "/dashboard"}>{user.name.split(" ")[0]}</Link>
        <button className="btn-connect ghost" onClick={logout} title={t("connect.logout")}>{t("connect.logout")}</button>
      </span>
    );
  }

  return <Link className="btn-connect" href="/login">{t("connect")}</Link>;
}
