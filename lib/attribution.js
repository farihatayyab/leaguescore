import { SITE } from "@/lib/site";

// Har API response mein ye block jata hai: { brandName, url, required: true }
export function getAttribution() {
  return { brandName: SITE.name, url: SITE.url || "", required: true };
}

export function withAttribution(body) {
  const base = body && typeof body === "object" && !Array.isArray(body) ? body : { data: body };
  return { ...base, attribution: getAttribution() };
}
