"use client";
import { useT } from "./LanguageProvider";

export default function LoadingText() {
  const t = useT();
  return <p>{t("loading")}</p>;
}
