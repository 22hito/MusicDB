/**
 * Правила звірки (без мережі — тестуються окремо). Головне правило: значення записується лише тоді,
 * коли його підтвердили щонайменше два незалежні офіційні джерела. Версії (live, remix, acoustic…)
 * не вважаються тією самою піснею.
 */
import { normalizeName } from "@musicdb/db";

const VERSION =
  /\b(live|acoustic|remix|rmx|instrumental|demo|karaoke|cover|edit|mix|version|session|unplugged|orchestral|piano|slowed|sped up|nightcore)\b/;
const NOISE =
  /\b(remaster(ed)?(\s+\d{4})?|\d{4}\s+remaster(ed)?|mono|stereo|explicit|clean|bonus track|single version|album version|original mix|from .+ soundtrack)\b/g;

/** Частина в дужках чи після « - ». */
function brackets(s: string) {
  const parts: string[] = [];
  const base = s
    .replace(/[([{]([^)\]}]*)[)\]}]/g, (_, x: string) => {
      parts.push(x);
      return " ";
    })
    .replace(/\s+-\s+(.+)$/, (_, x: string) => {
      parts.push(x);
      return " ";
    });
  return { base, parts };
}

const clean = (s: string) =>
  normalizeName(s)
    .replace(/&/g, " and ")
    .replace(/['’"«»“”.,!?:;*~]/g, "")
    .replace(/[-_/]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Ключ назви: без «feat. …», ремастерів і пунктуації; позначки версій лишаються. */
export function titleKey(title: string): string {
  const { base, parts } = brackets(title.replace(/\s+(feat\.?|ft\.?|featuring|with)\s+.+$/i, ""));
  const kept = parts
    .map((p) => clean(p))
    .filter((p) => !/^(feat|ft|featuring|with)\b/.test(p))
    .map((p) => p.replace(NOISE, "").trim())
    .filter((p) => p && VERSION.test(p));
  return [clean(base).replace(NOISE, "").trim(), ...kept].join(" ").replace(/\s+/g, " ").trim();
}

export const sameTitle = (a: string, b: string) => titleKey(a) === titleKey(b);

/** Ключ імені виконавця: без «The», «&» = «and». */
export const artistKey = (name: string) => clean(name).replace(/^the /, "");
export const sameArtist = (a: string, b: string) => artistKey(a) === artistKey(b);

/** Альбом: без «- Single», «- EP», «(Deluxe…)», ремастерів. */
export function albumKey(title: string): string {
  return clean(
    title
      .replace(/\s+-\s+(single|ep)$/i, "")
      .replace(/[([](deluxe|expanded|special|anniversary|bonus|remaster)[^)\]]*[)\]]/gi, ""),
  )
    .replace(NOISE, "")
    .trim();
}

export type Vote<T> = { source: string; value: T };
export type Agreed<T> = { value: T; sources: string[] };

/** Число, підтверджене ≥2 джерелами в межах допуску (найбільша група; значення — першого джерела групи). */
export function agreeNumber(
  votes: Vote<number | null | undefined>[],
  tolerance: number,
): Agreed<number> | null {
  const vs = votes.filter((v): v is Vote<number> => typeof v.value === "number" && v.value > 0);
  let best: Agreed<number> | null = null;
  for (const a of vs) {
    const group = vs.filter((b) => Math.abs(b.value - a.value) <= tolerance);
    if (group.length >= 2 && (!best || group.length > best.sources.length))
      best = { value: a.value, sources: group.map((g) => g.source) };
  }
  return best;
}

/** Точне значення, підтверджене ≥2 джерелами; за рівності — найраніше (для дат) або перше. */
export function agreeExact<T extends string | boolean>(
  votes: Vote<T | null | undefined>[],
): Agreed<T> | null {
  const counts = new Map<T, string[]>();
  for (const v of votes) {
    if (v.value === null || v.value === undefined || v.value === "") continue;
    counts.set(v.value, [...(counts.get(v.value) ?? []), v.source]);
  }
  const ok = [...counts.entries()].filter(([, s]) => s.length >= 2);
  if (!ok.length) return null;
  ok.sort((a, b) => b[1].length - a[1].length || String(a[0]).localeCompare(String(b[0])));
  const [value, sources] = ok[0]!;
  return { value, sources };
}

/** Повна дата YYYY-MM-DD з рядка дати/часу; неповні («2003», «2003-04») — null. */
export function fullDate(v: string | null | undefined): string | null {
  const m = v?.match(/^(\d{4}-\d{2}-\d{2})/);
  return m && !m[1]!.endsWith("-00") ? m[1]! : null;
}

// ─── Жанри ────────────────────────────────────────────────────────────────

/** Родини жанрів — спільна «мова» для Deezer (широкі), Apple (середні) і MusicBrainz (вузькі). */
const FAMILY_RULES: [RegExp, string][] = [
  [/(metal|core\b|djent|deathcore|grindcore)/, "metal"],
  [/(hip ?hop|rap|trap\b|g funk|crunk|horrorcore|drill|grime)/, "hip-hop"],
  [/(punk|emo\b|screamo)/, "punk"],
  [/(rock|grunge|rock and roll|rockabilly)/, "rock"],
  [/(r and b|rnb|r b|soul|funk\b|motown)/, "rnb"],
  [
    /(electro|electronic|house|techno|trance|dubstep|drum and bass|edm|synthwave|ambient|idm|breakbeat|jungle|dance\b|downtempo|trip hop|industrial)/,
    "electronic",
  ],
  [/(jazz|swing|big band|bebop)/, "jazz"],
  [/(blues)/, "blues"],
  [/(country|americana|bluegrass)/, "country"],
  [/(folk)/, "folk"],
  [/(reggae|ska\b|dub\b|dancehall)/, "reggae"],
  [/(classical|orchestral|chamber|opera|baroque)/, "classical"],
  [/(latin|reggaeton|salsa|bachata)/, "latin"],
  [/(pop)/, "pop"],
  [/(alternative)/, "alternative"],
];

/** Назви з Apple/Deezer, які означають конкретний вузький жанр. */
const ALIASES: Record<string, string> = {
  "hip hop rap": "hip-hop",
  "rap hip hop": "hip-hop",
  "hip hop": "hip-hop",
  rap: "hip-hop",
  "hardcore rap": "hardcore hip-hop",
  "r and b soul": "rnb",
  "r and b": "rnb",
  "soul and funk": "soul",
  "rock and roll": "rock and roll",
  electro: "electronic",
  "heavy metal": "heavy metal",
  "hard rock": "hard rock",
  "alternative rock": "alternative rock",
  "alternative metal": "alternative metal",
};

/** Назви, що не описують звучання пісні. */
const SKIP =
  /^(soundtrack|films games|film|kids|children|singer songwriter|christian|gospel|holiday|christmas|music|world|vocal|easy listening|comedy|spoken word|instrumental|asian music|african music|brazilian music|indian music|j pop|k pop)$/;

export type Canon = { name: string; families: string[] };

/** Жанр джерела → канонічна назва (як у нашому каталозі) і родини. */
export function canonGenre(raw: string): Canon | null {
  const key = clean(raw);
  if (!key || SKIP.test(key)) return null;
  const name = ALIASES[key] ?? key.replace(/\s+/g, " ");
  const families = FAMILY_RULES.filter(([re]) => re.test(name)).map(([, f]) => f);
  return { name, families };
}

/**
 * Жанри, підтверджені ≥2 джерелами: спершу точні (наприклад, MusicBrainz «hard rock» + Apple «Hard Rock»),
 * а якщо таких немає — родини (Deezer «Rock» + Apple «Hard Rock» → «rock»). Не більше трьох.
 */
export function agreeGenres(sources: { source: string; genres: string[] }[]): Agreed<string[]> | null {
  const exact = new Map<string, Set<string>>();
  const family = new Map<string, Set<string>>();
  for (const s of sources) {
    for (const g of s.genres) {
      const c = canonGenre(g);
      if (!c) continue;
      exact.set(c.name, (exact.get(c.name) ?? new Set()).add(s.source));
      for (const f of c.families) family.set(f, (family.get(f) ?? new Set()).add(s.source));
    }
  }
  const pick = (m: Map<string, Set<string>>) =>
    [...m.entries()]
      .filter(([, s]) => s.size >= 2)
      .sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]));
  const fine = pick(exact);
  const chosen = fine.length ? fine : pick(family);
  if (!chosen.length) return null;
  const top = chosen.slice(0, 3);
  return { value: top.map(([n]) => n), sources: [...new Set(top.flatMap(([, s]) => [...s]))] };
}

/** Посилання виконавця з MusicBrainz → тип для сторінки (лише корисні, без фан-сайтів і баз даних). */
export function linkKind(relType: string, url: string): string | null {
  const host = (() => {
    try {
      return new URL(url).hostname.replace(/^www\./, "");
    } catch {
      return "";
    }
  })();
  if (relType === "official homepage") return "website";
  const byHost: [RegExp, string][] = [
    [/(^|\.)spotify\.com$/, "spotify"],
    [/(^|\.)music\.apple\.com$|(^|\.)itunes\.apple\.com$/, "apple"],
    [/(^|\.)deezer\.com$/, "deezer"],
    [/(^|\.)youtube\.com$|(^|\.)youtu\.be$/, "youtube"],
    [/(^|\.)instagram\.com$/, "instagram"],
    [/(^|\.)twitter\.com$|(^|\.)x\.com$/, "x"],
    [/(^|\.)facebook\.com$/, "facebook"],
    [/(^|\.)tiktok\.com$/, "tiktok"],
    [/(^|\.)soundcloud\.com$/, "soundcloud"],
    [/(^|\.)bandcamp\.com$/, "bandcamp"],
    [/(^|\.)genius\.com$/, "genius"],
    [/(^|\.)vk\.com$/, "vk"],
  ];
  for (const [re, kind] of byHost) if (re.test(host)) return kind;
  return null;
}
