/**
 * Токени дизайну N'Owl — «Nocturne» з першої версії: нічна сова, акцент — бурштин («очі сови»).
 * Палітри задані в OKLCH тими самими формулами, що й у v1 (однакова L — однакова відчутна яскравість),
 * і перераховуються в hex — єдине джерело для сайту (CSS-змінні) і застосунку (React Native не знає oklch).
 *
 * Теми: «Опівніч» (dark), «Сутінки» (gray), «Світанок» (light). Акцент задається лише відтінком.
 */

export type ThemeName = "dark" | "gray" | "light";
export type AccentName = "amber" | "coral" | "rose" | "lavender" | "ocean" | "emerald";

/** Відтінки акцентів — як у налаштуваннях v1. */
export const ACCENT_HUES: Record<AccentName, number> = {
  amber: 78,
  coral: 38,
  rose: 5,
  lavender: 295,
  ocean: 235,
  emerald: 158,
};
export const accentNames = Object.keys(ACCENT_HUES) as AccentName[];
export const themeNames: ThemeName[] = ["dark", "gray", "light"];

// ─── oklch → sRGB (формули Björn Ottosson, як у браузері) ─────────────────

function oklchToRgb(L: number, C: number, h: number): [number, number, number] {
  const rad = (h * Math.PI) / 180;
  const a = C * Math.cos(rad);
  const b = C * Math.sin(rad);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return lin.map((x) => {
    const v = x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055;
    return Math.round(Math.min(1, Math.max(0, v)) * 255);
  }) as [number, number, number];
}

export function oklch(L: number, C: number, h: number): string {
  return `#${oklchToRgb(L, C, h)
    .map((v) => v.toString(16).padStart(2, "0"))
    .join("")}`;
}

/** hex + прозорість → rgba(), для м'яких фонів і сяйва. */
export function alpha(hex: string, a: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}

// ─── Палітри ──────────────────────────────────────────────────────────────

export type Palette = {
  bg: string;
  surface1: string;
  surface2: string;
  surface3: string;
  elevated: string;
  overlay: string;
  border: string;
  borderStrong: string;
  text: string;
  text2: string;
  textMuted: string;
  textSubtle: string;
  accent: string;
  accentStrong: string;
  accentLo: string;
  onAccent: string;
  accentSoft: string;
  /** Другий акцент — бузковий, для градієнтних заголовків і графіків. */
  accent2: string;
  danger: string;
  onDanger: string;
  success: string;
  warning: string;
  info: string;
  focus: string;
};

export function palette(theme: ThemeName, accent: AccentName = "amber"): Palette {
  const ah = ACCENT_HUES[accent];
  if (theme === "light") {
    const accentBase = oklch(0.5, 0.115, ah - 18);
    return {
      bg: oklch(0.968, 0.011, 85),
      surface1: oklch(0.99, 0.005, 85),
      surface2: oklch(0.94, 0.013, 85),
      surface3: oklch(0.915, 0.015, 85),
      elevated: "#ffffff",
      overlay: "rgba(40, 34, 56, 0.32)",
      border: oklch(0.895, 0.014, 85),
      borderStrong: oklch(0.81, 0.02, 85),
      text: oklch(0.22, 0.03, 272),
      text2: oklch(0.37, 0.03, 272),
      textMuted: oklch(0.49, 0.025, 272),
      textSubtle: oklch(0.6, 0.02, 272),
      accent: accentBase,
      accentStrong: oklch(0.6, 0.13, ah - 10),
      accentLo: oklch(0.42, 0.1, ah - 23),
      onAccent: "#ffffff",
      accentSoft: alpha(accentBase, 0.12),
      accent2: oklch(0.47, 0.15, 285),
      danger: oklch(0.52, 0.17, 25),
      onDanger: "#ffffff",
      success: oklch(0.49, 0.11, 160),
      warning: oklch(0.55, 0.13, 70),
      info: oklch(0.5, 0.14, 250),
      focus: accentBase,
    };
  }
  if (theme === "gray") {
    const accentBase = oklch(0.9, 0.1, ah + 6);
    return {
      bg: oklch(0.415, 0.018, 265),
      surface1: oklch(0.455, 0.019, 265),
      surface2: oklch(0.5, 0.02, 265),
      surface3: oklch(0.53, 0.021, 265),
      elevated: oklch(0.52, 0.02, 265),
      overlay: "rgba(20, 22, 34, 0.5)",
      border: oklch(0.54, 0.02, 265),
      borderStrong: oklch(0.62, 0.022, 265),
      text: oklch(0.99, 0.004, 85),
      text2: oklch(0.94, 0.01, 265),
      textMuted: oklch(0.89, 0.014, 265),
      textSubtle: oklch(0.8, 0.014, 265),
      accent: accentBase,
      accentStrong: oklch(0.94, 0.075, ah + 10),
      accentLo: oklch(0.82, 0.12, ah - 2),
      onAccent: oklch(0.22, 0.03, ah - 18),
      accentSoft: alpha(accentBase, 0.16),
      accent2: oklch(0.9, 0.07, 290),
      danger: oklch(0.89, 0.07, 22),
      onDanger: oklch(0.22, 0.04, 22),
      success: oklch(0.92, 0.09, 160),
      warning: oklch(0.9, 0.1, 80),
      info: oklch(0.88, 0.07, 250),
      focus: accentBase,
    };
  }
  const accentBase = oklch(0.82, 0.12, ah);
  return {
    bg: oklch(0.155, 0.018, 272),
    surface1: oklch(0.19, 0.02, 272),
    surface2: oklch(0.235, 0.022, 272),
    surface3: oklch(0.27, 0.022, 272),
    elevated: oklch(0.25, 0.022, 272),
    overlay: "rgba(8, 9, 20, 0.62)",
    border: oklch(0.29, 0.022, 272),
    borderStrong: oklch(0.37, 0.024, 272),
    text: oklch(0.95, 0.008, 85),
    text2: oklch(0.82, 0.014, 270),
    textMuted: oklch(0.68, 0.02, 270),
    textSubtle: oklch(0.55, 0.02, 270),
    accent: accentBase,
    accentStrong: oklch(0.88, 0.1, ah + 6),
    accentLo: oklch(0.7, 0.13, ah - 10),
    onAccent: oklch(0.2, 0.03, ah - 18),
    accentSoft: alpha(accentBase, 0.14),
    accent2: oklch(0.76, 0.11, 290),
    danger: oklch(0.72, 0.15, 22),
    onDanger: oklch(0.2, 0.03, 22),
    success: oklch(0.78, 0.13, 160),
    warning: oklch(0.82, 0.13, 78),
    info: oklch(0.72, 0.12, 250),
    focus: accentBase,
  };
}

/** Кураторська палітра сегментів колеса й конфеті (з v1). Більше 12 — HSL за «золотим кутом». */
export const WHEEL_COLORS = [
  "#c8a96e",
  "#8a6fb0",
  "#4f8c6f",
  "#b5555a",
  "#5b84a8",
  "#c98a4b",
  "#6fa89e",
  "#9a6b8f",
  "#7d9153",
  "#b0703f",
  "#5f6fa0",
  "#a3824f",
] as const;

export function wheelColor(i: number, n: number): string {
  if (n <= WHEEL_COLORS.length) return WHEEL_COLORS[i % WHEEL_COLORS.length]!;
  return `hsl(${Math.round((i * 137.508) % 360)} 38% 42%)`;
}

/** Категоріальна палітра графів (перевірена на дальтонізм у v1). */
export const GRAPH_SERIES: Record<"dark" | "light", [string, string, string]> = {
  dark: ["#3987e5", "#d95926", "#199e70"],
  light: ["#2a78d6", "#eb6834", "#1baf7a"],
};

/** Медалі п'єдесталу: золото, срібло, бронза. */
export const MEDALS = ["#e9c46a", "#c9ced6", "#d08c5a"] as const;

export const space = {
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64,
} as const;

export const radius = { xs: 4, sm: 8, md: 12, lg: 18, xl: 22, xxl: 28, full: 999 } as const;

export const font = {
  family: {
    sans: "Inter",
    /** Заголовки, логотип, великі числа — фірмовий серифний шрифт v1. */
    serif: "Playfair Display",
  },
} as const;

export const motion = {
  duration: { instant: 80, fast: 140, base: 220, slow: 360, slower: 520 },
  easing: { standard: [0.2, 0.8, 0.2, 1] as const, spring: [0.3, 1.4, 0.5, 1] as const },
} as const;

export type Theme = { name: ThemeName; accent: AccentName; colors: Palette };

export function getTheme(name: ThemeName, accent: AccentName = "amber"): Theme {
  return { name, accent, colors: palette(name, accent) };
}

/** Назви акцентів ранньої v2 → v1 (збережені налаштування не губляться). */
export function normalizeAccent(value: string | null | undefined): AccentName {
  const map: Record<string, AccentName> = { violet: "lavender", sky: "ocean" };
  const v = value ? (map[value] ?? value) : "amber";
  return (accentNames as string[]).includes(v) ? (v as AccentName) : "amber";
}

const kebab = (s: string) => s.replace(/[A-Z0-9]/g, (m) => `-${m.toLowerCase()}`);

function vars(p: Palette) {
  const base = Object.entries(p)
    .map(([k, v]) => `--n-${kebab(k)}:${v};`)
    .join("");
  return `${base}--n-accent-grad:linear-gradient(135deg,${p.accentStrong},${p.accent} 55%,${p.accentLo});`;
}

/**
 * CSS-змінні для сайту: тема — [data-theme=dark|gray|light|system], акцент — [data-accent=…].
 * Вставляється в <head> на сервері — без «блимання» теми.
 */
export function themeCss(): string {
  const rules: string[] = [];
  for (const accent of accentNames) {
    const a = accent === "amber" ? "" : `[data-accent="${accent}"]`;
    rules.push(`:root${a}{color-scheme:dark;${vars(palette("dark", accent))}}`);
    rules.push(`:root[data-theme="gray"]${a}{color-scheme:dark;${vars(palette("gray", accent))}}`);
    rules.push(`:root[data-theme="light"]${a}{color-scheme:light;${vars(palette("light", accent))}}`);
    rules.push(
      `@media (prefers-color-scheme: light){:root[data-theme="system"]${a}{color-scheme:light;${vars(palette("light", accent))}}}`,
    );
  }
  return rules.join("\n");
}

/** Детермінований колір-заглушка для обкладинок без картинки (за id). */
export function placeholderGradient(seed: string): [string, string] {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  const hue = h % 360;
  return [oklch(0.5, 0.09, hue), oklch(0.3, 0.06, (hue + 40) % 360)];
}

/**
 * Перемикачі можливостей продукту (спільні для сайту й застосунку).
 * lyrics — перегляд текстів пісень: сховано, доки немає легального джерела текстів (ліцензія);
 * код і дані лишаються, адмін і далі може вносити текст.
 * premium — підписка: сховано, поки немає платіжного провайдера (і на безкоштовному хостингу).
 */
export const FEATURES = { lyrics: false, premium: false } as const;
