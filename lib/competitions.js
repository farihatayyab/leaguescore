// Badi leagues list ke upar dikhane ke liye (naam ke hisaab se match hota hai)
const FEATURED = [
  /champions league/i,
  /europa league/i,
  /conference league/i,
  /world cup/i,
  /^english premier league/i,
  /la ?liga/i,
  /serie a/i,
  /bundesliga/i,
  /ligue 1/i,
  /eredivisie/i,
  /nations league/i,
  /nba/i,
  /^indian premier league|\bipl\b/i,
  /atp|wta|grand slam/i,
];

export const featuredRank = (name = "") => {
  const i = FEATURED.findIndex((re) => re.test(name));
  return i === -1 ? 999 : i;
};

export const isFeatured = (name) => featuredRank(name) !== 999;
