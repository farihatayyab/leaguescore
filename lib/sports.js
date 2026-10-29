// Pure constants: client aur server dono import kar sakte hain
export const SPORTS = [
  { key: "football", label: "Football" },
  { key: "basketball", label: "Basketball" },
  { key: "cricket", label: "Cricket" },
  { key: "tennis", label: "Tennis" },
];
export const isSport = (s) => SPORTS.some((x) => x.key === s);
