export type MatchState = "live" | "scheduled" | "finished" | "other";

// Filter tabs: API ke raw `status` ke bajaye normalised `state` par chalte hain
export type StatusFilter = "all" | "live" | "scheduled" | "finished" | "fav";

export interface Match {
  sport: string;
  slug: string;
  id: string;
  home: string;
  away: string;
  homeLogo: string;
  awayLogo: string;
  hs: number | null;
  as: number | null;
  state: MatchState;
  live: boolean;
  statusText: string;
  minute: number | string | null;
  iso: string;
  time: string;
  day: string; // "YYYY-MM-DD" (Asia/Karachi)
  dayLabel: string;
  competition: string;
  compSlug: string;
  compLogo: string;
  // normalized country info ("" = unknown; UI suffix chhupa deta hai)
  country: string; // "Japan" ya intl competition ke liye region ("Europe" / "International")
  countryCode: string; // ISO2 / "gb-eng" (flag ke liye)
  countryFlag: string; // flag image URL ("" = flag nahi)
  region: string;
  international: boolean;
  homeCountry: string;
  awayCountry: string;
  round: string;
}
