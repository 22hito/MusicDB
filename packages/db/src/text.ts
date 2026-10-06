/**
 * Нормалізація назв і slug-и для адрес сторінок.
 */

const translit: Record<string, string> = {
  а: "a",
  б: "b",
  в: "v",
  г: "h",
  ґ: "g",
  д: "d",
  е: "e",
  є: "ye",
  ж: "zh",
  з: "z",
  и: "y",
  і: "i",
  ї: "yi",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "kh",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "shch",
  ь: "",
  ю: "yu",
  я: "ya",
  ы: "y",
  э: "e",
  ё: "yo",
  ъ: "",
};

/** Без діакритики, нижній регістр, один пробіл: «Beyoncé  » → «beyonce». Кирилиця лишається кирилицею. */
export function normalizeName(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .normalize("NFC")
    .toLowerCase()
    .replace(/[‘’`´]/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/** «Океан Ельзи» → «okean-elzy», «AC/DC» → «ac-dc». Порожній результат — «item». */
export function slugify(value: string): string {
  const base = normalizeName(value)
    .replace(/[а-яёіїєґ]/g, (ch) => translit[ch] ?? "")
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
  return base || "item";
}

/** Унікальний slug: якщо зайнятий — додає -2, -3… */
export function uniqueSlug(value: string, taken: Set<string>): string {
  const base = slugify(value);
  let slug = base;
  for (let i = 2; taken.has(slug); i++) slug = `${base}-${i}`;
  taken.add(slug);
  return slug;
}

/** «00:03:24» / «3:24» / 204 (секунди) → мілісекунди. */
export function parseDurationMs(value: string | number | null | undefined): number {
  if (value == null) return 0;
  if (typeof value === "number") return Math.max(0, Math.round(value * 1000));
  const parts = value.trim().split(":").map(Number);
  if (parts.some((p) => Number.isNaN(p))) return 0;
  let seconds = 0;
  for (const p of parts) seconds = seconds * 60 + p;
  return Math.round(seconds * 1000);
}

/** Розбиває рядок виконавців «A, B feat. C» на імена (як старий бекенд, плюс feat./ft.). */
export function splitArtists(value: string): string[] {
  return value
    .split(/\s*(?:,|;|\bfeat\.?|\bft\.?|\bfeaturing\b)\s*/i)
    .map((s) => s.trim())
    .filter(Boolean);
}
