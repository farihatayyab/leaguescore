"use client";
import { useCallback, useRef, useState } from "react";

export function useToast() {
  const [t, setT] = useState(null);
  const timer = useRef(null);
  const show = useCallback((text, type = "ok") => {
    clearTimeout(timer.current);
    setT({ text, type });
    timer.current = setTimeout(() => setT(null), 3500);
  }, []);
  const node = t ? (
    <div className={`adm-toast ${t.type}`} role="status">
      {t.text}
    </div>
  ) : null;
  return [node, show];
}