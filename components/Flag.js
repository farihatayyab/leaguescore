"use client";
import { useState } from "react";

// Country flag (image). Load na ho ya src khali ho to kuch render nahi hota, layout nahi tootta.
export default function Flag({ src, name = "", size = 18 }) {
  const [bad, setBad] = useState(false);
  if (!src || bad) return null;
  return (
    <img
      className="flag"
      src={src}
      alt=""
      title={name}
      width={Math.round(size * 1.33)}
      height={size}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setBad(true)}
    />
  );
}
