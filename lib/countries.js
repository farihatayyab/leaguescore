// Country helpers: API se country nikalna, normalize karna, flag URL banana, aur search ke liye text.
// Server + client dono jagah chalta hai (koi Node-only API nahi).

// code | Name | aliases / demonyms (comma separated, lowercase)
const RAW = `
jp|Japan|japanese
gb-eng|England|english
gb-sct|Scotland|scottish
gb-wls|Wales|welsh
gb-nir|Northern Ireland|northern irish
es|Spain|spanish
it|Italy|italian
de|Germany|german
fr|France|french
nl|Netherlands|dutch,holland
pt|Portugal|portuguese
be|Belgium|belgian
tr|Turkey|turkish,turkiye,türkiye
ru|Russia|russian
ua|Ukraine|ukrainian
gr|Greece|greek
ch|Switzerland|swiss
at|Austria|austrian
dk|Denmark|danish
se|Sweden|swedish
no|Norway|norwegian
fi|Finland|finnish
is|Iceland|icelandic
ie|Ireland|irish,republic of ireland
pl|Poland|polish
cz|Czech Republic|czech,czechia
sk|Slovakia|slovak
hu|Hungary|hungarian
ro|Romania|romanian
bg|Bulgaria|bulgarian
rs|Serbia|serbian
hr|Croatia|croatian
si|Slovenia|slovenian
ba|Bosnia and Herzegovina|bosnian,bosnia
me|Montenegro|montenegrin
mk|North Macedonia|macedonian,macedonia
al|Albania|albanian
xk|Kosovo|kosovan,kosovar
md|Moldova|moldovan
by|Belarus|belarusian
lt|Lithuania|lithuanian
lv|Latvia|latvian
ee|Estonia|estonian
cy|Cyprus|cypriot
mt|Malta|maltese
lu|Luxembourg|luxembourgish
ge|Georgia|georgian
am|Armenia|armenian
az|Azerbaijan|azerbaijani
kz|Kazakhstan|kazakh
uz|Uzbekistan|uzbek
il|Israel|israeli
us|United States|american,usa,u.s.a.,us,united states of america
ca|Canada|canadian
mx|Mexico|mexican
br|Brazil|brazilian
ar|Argentina|argentine,argentinian
cl|Chile|chilean
co|Colombia|colombian
uy|Uruguay|uruguayan
py|Paraguay|paraguayan
pe|Peru|peruvian
ec|Ecuador|ecuadorian
ve|Venezuela|venezuelan
bo|Bolivia|bolivian
cr|Costa Rica|costa rican
pa|Panama|panamanian
hn|Honduras|honduran
sv|El Salvador|salvadoran
gt|Guatemala|guatemalan
jm|Jamaica|jamaican
cu|Cuba|cuban
ht|Haiti|haitian
tt|Trinidad and Tobago|trinidadian
kr|South Korea|south korean,korean,korea republic,korea
kp|North Korea|north korean,korea dpr
cn|China|chinese,china pr
hk|Hong Kong|hong kong chinese
tw|Taiwan|taiwanese,chinese taipei
in|India|indian
pk|Pakistan|pakistani
bd|Bangladesh|bangladeshi
lk|Sri Lanka|sri lankan
np|Nepal|nepali,nepalese
af|Afghanistan|afghan
th|Thailand|thai
vn|Vietnam|vietnamese
my|Malaysia|malaysian
sg|Singapore|singaporean
id|Indonesia|indonesian
ph|Philippines|philippine,filipino
kh|Cambodia|cambodian
mm|Myanmar|burmese
sa|Saudi Arabia|saudi
ae|United Arab Emirates|emirati,uae,u.a.e.
qa|Qatar|qatari
kw|Kuwait|kuwaiti
bh|Bahrain|bahraini
om|Oman|omani
jo|Jordan|jordanian
lb|Lebanon|lebanese
sy|Syria|syrian
iq|Iraq|iraqi
ir|Iran|iranian
ye|Yemen|yemeni
au|Australia|australian
nz|New Zealand|new zealander,kiwi
eg|Egypt|egyptian
ma|Morocco|moroccan
dz|Algeria|algerian
tn|Tunisia|tunisian
ly|Libya|libyan
ng|Nigeria|nigerian
gh|Ghana|ghanaian
sn|Senegal|senegalese
ci|Ivory Coast|ivorian,cote d'ivoire,côte d'ivoire
cm|Cameroon|cameroonian
za|South Africa|south african
ke|Kenya|kenyan
ug|Uganda|ugandan
tz|Tanzania|tanzanian
et|Ethiopia|ethiopian
zm|Zambia|zambian
zw|Zimbabwe|zimbabwean
ao|Angola|angolan
cd|DR Congo|congolese,congo dr
ml|Mali|malian
pr|Puerto Rico|puerto rican
tm|Turkmenistan|turkmen,turkmenistani
bf|Burkina Faso|burkinabe
`;

const COUNTRIES = [];
for (const line of RAW.trim().split("\n")) {
  const [code, name, aliases = ""] = line.split("|");
  if (!name) continue;
  COUNTRIES.push({ code, name, aliases: aliases.split(",").map((s) => s.trim().toLowerCase()).filter(Boolean) });
}

const norm = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

// lookup: har naam / alias / code -> country
const BY_KEY = new Map();
for (const c of COUNTRIES) {
  for (const k of [c.name, c.code, ...c.aliases]) {
    const key = norm(k);
    if (key && !BY_KEY.has(key)) BY_KEY.set(key, c);
  }
}

// Competition naam ke shuru mein demonym / country naam (lambe pehle, taake "south korean" > "korean")
const PREFIXES = [];
for (const c of COUNTRIES) for (const k of [c.name, ...c.aliases]) if (norm(k).length >= 3) PREFIXES.push([norm(k), c]);
PREFIXES.sort((a, b) => b[0].length - a[0].length);

// Competition naam mein kahin bhi poora country naam (sirf asli naam, aliases nahi)
const NAMES_LONG_FIRST = [...COUNTRIES].sort((a, b) => b.name.length - a.name.length);

const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const findCountry = (v) => BY_KEY.get(norm(v)) || null;

// Flag image URL (emoji Windows par nazar nahi aate, isliye image)
export const flagUrl = (code) => (code ? `https://flagcdn.com/w40/${String(code).toLowerCase()}.png` : "");

// 3-letter short codes jo competition naam ke shuru mein aate hain ("ALG U20", "EGY Premier League")
const ISO3 = Object.fromEntries(
  "ALG:dz,EGY:eg,MAR:ma,TUN:tn,KSA:sa,UAE:ae,QAT:qa,JPN:jp,KOR:kr,CHN:cn,AUS:au,USA:us,ENG:gb-eng,SCO:gb-sct,WAL:gb-wls,ESP:es,ITA:it,GER:de,FRA:fr,BRA:br,ARG:ar,MEX:mx,POR:pt,NED:nl,BEL:be,TUR:tr,GRE:gr,RUS:ru,UKR:ua,POL:pl,SRB:rs,CRO:hr,IRN:ir,IRQ:iq,JOR:jo,PAK:pk,IND:in,THA:th,VIE:vn,IDN:id,MAS:my,NGA:ng,GHA:gh,SEN:sn,CMR:cm,RSA:za,KEN:ke,CAN:ca,COL:co,CHI:cl,URU:uy,PAR:py,PER:pe,ECU:ec,SUI:ch,AUT:at,DEN:dk,SWE:se,NOR:no,FIN:fi,IRL:ie,CZE:cz,HUN:hu,ROU:ro,BUL:bg,SVK:sk,SVN:si,ISR:il,LBN:lb,SYR:sy,OMA:om,KUW:kw,BHR:bh,UZB:uz,KAZ:kz,NZL:nz,CIV:ci,COD:cd,MLI:ml,ANG:ao,PUR:pr,TKM:tm"
    .split(",")
    .map((x) => x.split(":"))
);

// Mashhoor leagues jinke naam mein mulk nahi hota
const LEAGUE_HINTS = [
  [/\b(b\.?\s?league|j\.?\s?league|j[123]\b|jpn)/i, "jp"],
  [/\bk\.?\s?league|kbl\b|kbo\b/i, "kr"],
  [/\bcba\b|chinese super|csl\b/i, "cn"],
  [/\b(nba|wnba|mls|ncaa|nfl|mlb|nhl|g league)\b/i, "us"],
  [/\b(a-league|nbl|big bash|bbl)\b/i, "au"],
  [/\bipl\b|\bpkl\b/i, "in"],
  [/\bpsl\b|pakistan super/i, "pk"],
  [/\bsaudi\b|\broshn\b/i, "sa"],
  [/\bliga mx\b/i, "mx"],
  [/\bprimeira liga\b/i, "pt"],
  [/\bsuper lig\b/i, "tr"],
  [/\bsuperliga\b/i, "dk"],
  [/\ballsvenskan\b/i, "se"],
  [/\beliteserien\b/i, "no"],
  [/\bbundesliga\b/i, "de"],
  [/\bla ?liga\b|\bacb\b/i, "es"],
  [/\bserie [abc]\b|\blega\b/i, "it"],
  [/\bligue [12]\b|\bpro a\b/i, "fr"],
  [/\bpremier league\b.*\b(england|english)\b|\befl\b|\bchampionship\b.*\bengland\b/i, "gb-eng"],
  [/\beredivisie\b/i, "nl"],
  [/\bsuper league\b.*greece|\bgreek\b/i, "gr"],
];

// ---------------------------------------------------------------------------
// International / continental competitions
// ---------------------------------------------------------------------------
const STRONG_INTL = /^(uefa|fifa|afc|caf|conmebol|concacaf|ofc|international|world|olympic|intl|club friendl|friendl)/i;
const WEAK_INTL =
  /(champions league|europa league|conference league|nations league|world cup|euro\b|european championship|asian cup|africa cup|copa |libertadores|sudamericana|gold cup|super cup|olympic|friendl|qualif|international)/i;

export function regionOf(name = "") {
  const n = String(name);
  if (/\bafc\b|asian|asia\b/i.test(n)) return "Asia";
  if (/\bcaf\b|africa/i.test(n)) return "Africa";
  if (/conmebol|libertadores|sudamericana|copa america|south america/i.test(n)) return "South America";
  if (/concacaf|gold cup|north america|caribbean|central america/i.test(n)) return "North America";
  if (/\bofc\b|oceania/i.test(n)) return "Oceania";
  if (/uefa|europ|conference league|champions league|euro\b/i.test(n)) return "Europe";
  return "International";
}

// ---------------------------------------------------------------------------
// API object se country nikalna (alag alag providers alag shape bhejte hain)
// ---------------------------------------------------------------------------
const str = (v) => (typeof v === "string" ? v.trim() : "");

function fromValue(v) {
  if (v == null || v === "") return null;
  if (typeof v === "string") {
    const s = v.trim();
    return s ? { name: s, code: "", flag: "" } : null;
  }
  if (typeof v === "object") {
    const name = str(v.name) || str(v.country_name) || str(v.title) || str(v.long) || str(v.short);
    const code = str(v.code) || str(v.alpha2) || str(v.iso2) || str(v.iso) || str(v.country_code);
    const flagRaw = str(v.flag) || str(v.flag_url) || str(v.icon) || str(v.logo) || str(v.image);
    if (!name && !code) return null;
    return { name, code, flag: /^(https?:)?\/\//.test(flagRaw) || flagRaw.startsWith("/") ? flagRaw : "" };
  }
  return null;
}

// Raw match / fixture ke saare mumkina country fields (priority order mein)
export function readRawCountry(f) {
  if (!f || typeof f !== "object") return null;
  const candidates = [
    f.country,
    f.competition_country,
    f.league_country,
    f.tournament_country,
    f.country_name && { name: f.country_name, code: f.country_code, flag: f.country_flag || f.flag },
    f.competition?.country,
    f.league?.country,
    f.tournament?.country,
    f.tournament?.category?.country,
    f.competition?.category?.country,
    f.area,
    f.competition?.area,
    f.league?.area,
    // fallback: category (football mein aksar country hi hota hai)
    f.category,
    f.tournament?.category,
    f.competition?.category,
    f.league?.category,
  ];
  let out = null;
  for (const c of candidates) {
    const r = fromValue(c);
    if (r && (r.name || r.code)) {
      out = r;
      break;
    }
  }
  if (!out) return null;
  // alag se aaya hua code / flag
  const code = out.code || str(f.country_code) || str(f.competition_country_code);
  const flag = out.flag || str(f.country_flag);
  return { name: out.name, code, flag: /^(https?:)?\/\//.test(flag) || flag.startsWith("/") ? flag : "" };
}

// Final normalized country info. Kabhi undefined nahi dega.
// -> { country, countryCode, countryFlag, region, international }
export function resolveCountry(raw, competition = "") {
  const comp = String(competition || "");
  const empty = { country: "", countryCode: "", countryFlag: "", region: "", international: false };

  const intl = (extra = {}) => ({ ...empty, country: regionOf(comp), region: regionOf(comp), international: true, ...extra });

  const api = readRawCountry(raw);
  if (api) {
    const hit = findCountry(api.name) || findCountry(api.code);
    if (hit) {
      return {
        country: hit.name,
        countryCode: hit.code,
        countryFlag: api.flag || flagUrl(hit.code),
        region: "",
        international: false,
      };
    }
    // API ne naam diya jo hamari list mein nahi (misal "World", "Europe", "ATP"): intl ho to region, warna jaisa hai waisa
    const label = api.name;
    if (/^(world|international|intl|europe|asia|africa|south america|north america|oceania)$/i.test(label)) {
      return intl({ country: /^(world|international|intl)$/i.test(label) ? regionOf(comp) : label, region: label });
    }
    if (label) return { ...empty, country: label, countryCode: /^[a-z]{2}$/i.test(api.code) ? api.code.toLowerCase() : "", countryFlag: api.flag || (/^[a-z]{2}$/i.test(api.code) ? flagUrl(api.code) : "") };
  }

  // API se country nahi mili: competition ke naam se andaza
  if (comp) {
    if (STRONG_INTL.test(comp)) return intl();
    const n = norm(comp);
    for (const [k, c] of PREFIXES) {
      if (n === k || n.startsWith(k + " ")) return { ...empty, country: c.name, countryCode: c.code, countryFlag: flagUrl(c.code) };
    }
    // "ALG U20" -> pehla lafz 3-letter code
    const tok = comp.trim().split(/[\s-]+/)[0];
    if (/^[A-Z]{3}$/.test(tok) && ISO3[tok]) {
      const c = findCountry(ISO3[tok]);
      if (c) return { ...empty, country: c.name, countryCode: c.code, countryFlag: flagUrl(c.code) };
    }
    for (const [re, code] of LEAGUE_HINTS) {
      if (re.test(comp)) {
        const c = findCountry(code);
        if (c) return { ...empty, country: c.name, countryCode: c.code, countryFlag: flagUrl(c.code) };
      }
    }
    for (const c of NAMES_LONG_FIRST) {
      if (new RegExp(`(^|[^a-z])${esc(norm(c.name))}([^a-z]|$)`).test(n)) {
        return { ...empty, country: c.name, countryCode: c.code, countryFlag: flagUrl(c.code) };
      }
    }
    if (WEAK_INTL.test(comp)) return intl();
  }
  return empty; // UI sirf suffix chhupa dega
}

// Team ka country (agar API ne diya ho)
export function teamCountry(v) {
  const r = fromValue(v);
  if (!r) return "";
  const hit = findCountry(r.name) || findCountry(r.code);
  return hit ? hit.name : r.name || "";
}

// ---------------------------------------------------------------------------
// Manual fallback: jab API ne country khali bheji ho (compSlug ya competition prefix se)
// ---------------------------------------------------------------------------
const SLUG_FALLBACK = {
  "alg-u20": "dz",
  "aus-champ": "au",
  "pur-lpr": "pr",
  "turkmenistanyn-yokary-ligasy": "tm",
  "atush-cup": "cn",
};
const PREFIX_FALLBACK = [
  [/^alg\b/i, "dz"],
  [/^aus\b/i, "au"],
  [/^pur\b/i, "pr"],
];

const fromCode = (code) => {
  const c = findCountry(code);
  return c ? { country: c.name, countryCode: c.code.toLowerCase(), countryFlag: flagUrl(c.code) } : null;
};

export function fallbackCountry(compSlug = "", competition = "") {
  const slug = String(compSlug || "").toLowerCase();
  if (SLUG_FALLBACK[slug]) return fromCode(SLUG_FALLBACK[slug]);
  for (const [re, code] of PREFIX_FALLBACK) if (re.test(String(competition || "").trim())) return fromCode(code);
  return null;
}

// resolveCountry() ka result khali ho to manual fallback laga do
export function withFallback(info, compSlug, competition) {
  if (info?.country) return info;
  const fb = fallbackCountry(compSlug, competition);
  return fb ? { ...info, ...fb, international: false } : info;
}

// ---------------------------------------------------------------------------
// getMatchCountryInfo(match) -> { country, countryCode, countryFlag, label, international }
//  label = header mein dikhane wala naam ("Brazil" / "Asia" / "")
// ---------------------------------------------------------------------------
export function getMatchCountryInfo(m) {
  const none = { country: "", countryCode: "", countryFlag: "", label: "", international: false };
  if (!m) return none;

  // International: region dikhao, flag nahi
  if (m.international === true) {
    const label = m.region || m.country || "";
    return { ...none, country: m.country || label, label, international: true };
  }

  // Direct API fields
  if (m.country) {
    const code = m.countryCode || findCountry(m.country)?.code || "";
    return {
      country: m.country,
      countryCode: code,
      countryFlag: m.countryFlag || flagUrl(code),
      label: m.country,
      international: false,
    };
  }

  // country khali: compSlug / competition prefix
  const fb = fallbackCountry(m.compSlug, m.competition);
  if (fb) return { ...fb, label: fb.country, international: false };

  return none;
}

// ---------------------------------------------------------------------------
// Search: "japan", "english", "jp" jaisi query match karne ke liye
// ---------------------------------------------------------------------------
export function countryTerms(name) {
  const c = findCountry(name);
  if (!c) return name ? [norm(name)] : [];
  return [norm(c.name), c.code.toLowerCase(), ...c.aliases.map(norm)];
}

// Ek match ka poora searchable text (lowercase), WeakMap mein cache hota hai.
const cache = new WeakMap();
export function matchHaystack(m) {
  let s = cache.get(m);
  if (s !== undefined) return s;
  const info = getMatchCountryInfo(m);
  const parts = [m.home, m.away, m.competition, info.country, info.label, m.region, m.homeCountry, m.awayCountry]
    .filter(Boolean)
    .map(norm);
  for (const c of [info.country, m.homeCountry, m.awayCountry]) parts.push(...countryTerms(c));
  s = parts.join(" | ");
  cache.set(m, s);
  return s;
}

export function matchesQuery(m, q) {
  const needle = norm(q);
  if (!needle) return true;
  const hay = matchHaystack(m);
  if (hay.includes(needle)) return true;
  // do chhote harf ka code (jp, es) sirf poora match ho
  return hay.split(" | ").some((p) => p === needle);
}

// Group header ka suffix: "Japan" / "Europe" / ""  (kabhi undefined nahi)
export const countryLabel = (m) => (m && typeof m.country === "string" ? m.country : "");