// Site ki settings: footer, about/contact/legal pages sab yahin se naam aur links lete hain.
export const SITE = {
  name: "LeagueScore",
  url: process.env.SITE_URL || "",
  // Contact page par dikhane ke liye (khali ho to email line chhup jati hai)
  email: process.env.SITE_EMAIL || "",
  // Legal pages ki "last updated" date: policy badlo to ye bhi badlo
  legalUpdated: "4 November 2026",
};

// Footer ke social icons: sirf wahi dikhte hain jin ka link .env mein diya ho
export const SOCIALS = [
  { key: "twitter", label: "X / Twitter", href: process.env.SOCIAL_TWITTER || "" },
  { key: "facebook", label: "Facebook", href: process.env.SOCIAL_FACEBOOK || "" },
  { key: "instagram", label: "Instagram", href: process.env.SOCIAL_INSTAGRAM || "" },
  { key: "telegram", label: "Telegram", href: process.env.SOCIAL_TELEGRAM || "" },
  { key: "youtube", label: "YouTube", href: process.env.SOCIAL_YOUTUBE || "" },
].filter((s) => s.href);

export const INFO_LINKS = [
  { href: "/about", label: "About Us" },
  { href: "/contact", label: "Contact" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/terms", label: "Terms of Use" },
  { href: "/cookies", label: "Cookie Policy" },
  { href: "/feedback", label: "Feedback" },
];
