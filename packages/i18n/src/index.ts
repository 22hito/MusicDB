import { en } from "./en";
import { type Messages, uk } from "./uk";

export type Locale = "uk" | "en";
export const locales: Locale[] = ["uk", "en"];
export const dictionaries = { uk, en } as const;

type Leaves<T, P extends string = ""> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Leaves<T[K], `${P}${K}.`>;
}[keyof T & string];

type StripPlural<K extends string> = K extends `${infer Base}_${"one" | "few" | "many" | "other"}` ? Base : K;

/** Усі ключі перекладу: «player.play», «release.songs» (множина — без суфікса). */
export type TranslationKey = StripPlural<Leaves<Messages>>;

export type TranslateParams = Record<string, string | number>;
export type Translate = (key: TranslationKey, params?: TranslateParams) => string;

function lookup(dict: unknown, path: string): string | undefined {
  let node: unknown = dict;
  for (const part of path.split(".")) {
    if (node && typeof node === "object" && part in (node as object))
      node = (node as Record<string, unknown>)[part];
    else return undefined;
  }
  return typeof node === "string" ? node : undefined;
}

export function createTranslator(requested: Locale): Translate {
  // Сторінка 404 всередині оболонки сайту отримує порожню мову — Intl.PluralRules("") падає.
  const locale: Locale = requested in dictionaries ? requested : "uk";
  const dict = dictionaries[locale];
  const plural = new Intl.PluralRules(locale);
  const number = new Intl.NumberFormat(locale);
  return (key, params) => {
    let template: string | undefined;
    if (params && typeof params.count === "number") {
      template = lookup(dict, `${key}_${plural.select(params.count)}`) ?? lookup(dict, `${key}_other`);
    }
    template ??= lookup(dict, key) ?? lookup(uk, key) ?? key;
    if (!params) return template;
    return template.replace(/\{(\w+)\}/g, (_, name: string) => {
      const value = params[name];
      if (value === undefined) return `{${name}}`;
      return typeof value === "number" ? number.format(value) : value;
    });
  };
}

export function detectLocale(input: string | null | undefined): Locale {
  return input && /^en\b/i.test(input) ? "en" : "uk";
}

// ─── Форматування ─────────────────────────────────────────────────────────

/** 245000 → «4:05», 3_725_000 → «1:02:05». */
export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return h > 0
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

/** Довга тривалість для заголовків: «1 год 12 хв». */
export function formatLongDuration(ms: number, t: Translate): string {
  const minutes = Math.round(ms / 60_000);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h > 0 ? `${h} ${t("time.hr")} ${m} ${t("time.min")}` : `${m} ${t("time.min")}`;
}

export function formatRelative(iso: string, t: Translate, locale: Locale, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const min = Math.floor(diff / 60_000);
  if (min < 1) return t("time.justNow");
  if (min < 60) return t("time.minutesAgo", { count: min });
  const h = Math.floor(min / 60);
  if (h < 24) return t("time.hoursAgo", { count: h });
  const d = Math.floor(h / 24);
  if (d < 7) return t("time.daysAgo", { count: d });
  return new Date(iso).toLocaleDateString(locale === "uk" ? "uk-UA" : "en-US", {
    day: "numeric",
    month: "short",
    year: d > 300 ? "numeric" : undefined,
  });
}

export function formatCompact(n: number, locale: Locale): string {
  return new Intl.NumberFormat(locale === "uk" ? "uk-UA" : "en-US", {
    notation: n >= 10_000 ? "compact" : "standard",
  }).format(n);
}

export { en, type Messages, uk };
