// Sidebar ki lists. re = API ke competition naam se match karne ke liye,
// slug = agar aaj ke matches mein wo competition na ho to competition page ka andaza.
export const TOP_COMPETITIONS = [
  { label: "FIFA World Cup", re: /world cup/i, slug: "fifa-world-cup" },
  { label: "UEFA European Championship", re: /european championship|^euro\b/i, slug: "uefa-european-championship" },
  { label: "UEFA Nations League", re: /nations league/i, slug: "uefa-nations-league" },
  { label: "AFC Asian Cup", re: /asian cup/i, slug: "afc-asian-cup" },
  { label: "UEFA Champions League", re: /^uefa champions league/i, slug: "uefa-champions-league" },
  { label: "UEFA Europa League", re: /^uefa europa league/i, slug: "uefa-europa-league" },
  { label: "UEFA Conference League", re: /conference league/i, slug: "uefa-europa-conference-league" },
];

export const TOP_LEAGUES = [
  { label: "English Premier League", re: /^english premier league/i, slug: "english-premier-league" },
  { label: "Spanish La Liga", re: /^spanish la ?liga/i, slug: "spanish-la-liga" },
  { label: "Italian Serie A", re: /^italian serie a/i, slug: "italian-serie-a" },
  { label: "German Bundesliga", re: /^german bundesliga/i, slug: "german-bundesliga" },
  { label: "French Ligue 1", re: /^french ligue 1/i, slug: "french-ligue-1" },
  { label: "Dutch Eredivisie", re: /eredivisie/i, slug: "dutch-eredivisie" },
];

// Sirf naam; photo SportScore Player API se aati hai
export const TOP_PLAYERS = [
  "Lionel Messi",
  "Cristiano Ronaldo",
  "Kylian Mbappe",
  "Erling Haaland",
  "Mohamed Salah",
  "Jude Bellingham",
  "Vinicius Junior",
  "Robert Lewandowski",
];