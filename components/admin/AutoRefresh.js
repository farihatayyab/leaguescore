"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// While a sync is running, refresh the server data every few seconds.
export default function AutoRefresh({ active, every = 3000 }) {
  const router = useRouter();
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => router.refresh(), every);
    return () => clearInterval(t);
  }, [active, every, router]);
  return null;
}
