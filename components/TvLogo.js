"use client";
import { useState } from "react";

// Channel logo. Falls back to a coloured initial if the image is missing or fails to load.
export default function Logo({ src, name, size = 44 }) {
  const [bad, setBad] = useState(false);
  if (src && !bad) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        className="tv-logo"
        src={src}
        alt={name ? `${name} logo` : ""}
        width={size}
        height={size}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setBad(true)}
      />
    );
  }
  return <span className="tv-logo tv-logo-ph" aria-hidden="true">{(name || "?").trim()[0]?.toUpperCase()}</span>;
}
