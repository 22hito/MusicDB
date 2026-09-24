// Кольори й типографіка — 1:1 з поточної веб-версії (wwwroot/styles.css,
// :root / html[data-theme="light"/"gray"]). Сайт задає палітру в oklch, а
// акцент — лише відтінком --ah (6 пресетів у налаштуваннях). Тут ті самі
// формули, перераховані в hex (RN не розуміє oklch, а код додає до кольорів
// hex-альфу на кшталт `${theme.accent}1f`).

export type ThemeMode = 'dark' | 'light' | 'gray';
// Вибір користувача: конкретна тема або "як у системі".
export type ThemePref = ThemeMode | 'system';

export type AccentKey = 'amber' | 'coral' | 'rose' | 'lavender' | 'ocean' | 'emerald';
export const ACCENT_HUES: Record<AccentKey, number> = { amber: 78, coral: 38, rose: 5, lavender: 295, ocean: 235, emerald: 158 };
export const ACCENT_KEYS = Object.keys(ACCENT_HUES) as AccentKey[];

export interface AppTheme {
  mode: ThemeMode;
  bg: string;
  surface: string;
  surface2: string;
  elevated: string;
  border: string;
  borderStrong: string;
  accent: string;
  accentHi: string;
  accentLo: string;
  accent2: string;
  text: string;
  text2: string;
  muted: string;
  green: string;
  red: string;
  onAccent: string; // текст на кнопках з фоном --accent
  onRed: string;
}

// ─── oklch → sRGB hex (формули Björn Ottosson, ті самі, що в браузері) ───
function oklch(L: number, C: number, h: number): string {
  const rad = (h * Math.PI) / 180;
  const a = C * Math.cos(rad);
  const b = C * Math.sin(rad);
  const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
  const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
  const s_ = L - 0.0894841775 * a - 1.291485548 * b;
  const l = l_ ** 3;
  const m = m_ ** 3;
  const s = s_ ** 3;
  const lin = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  return (
    '#' +
    lin
      .map((x) => {
        const v = x <= 0.0031308 ? 12.92 * x : 1.055 * Math.pow(x, 1 / 2.4) - 0.055;
        return Math.round(Math.min(1, Math.max(0, v)) * 255)
          .toString(16)
          .padStart(2, '0');
      })
      .join('')
  );
}

// "Опівніч": синювато-чорна, золотий акцент.
function dark(ah: number): AppTheme {
  return {
    mode: 'dark',
    bg: oklch(0.155, 0.018, 272),
    surface: oklch(0.19, 0.02, 272),
    surface2: oklch(0.235, 0.022, 272),
    elevated: oklch(0.215, 0.022, 272),
    border: oklch(0.29, 0.022, 272),
    borderStrong: oklch(0.37, 0.024, 272),
    accent: oklch(0.82, 0.12, ah),
    accentHi: oklch(0.88, 0.1, ah + 6),
    accentLo: oklch(0.7, 0.13, ah - 10),
    onAccent: oklch(0.2, 0.03, ah - 18),
    accent2: oklch(0.76, 0.11, 290),
    text: oklch(0.95, 0.008, 85),
    text2: oklch(0.82, 0.014, 270),
    muted: oklch(0.68, 0.02, 270),
    green: oklch(0.78, 0.13, 160),
    red: oklch(0.72, 0.15, 22),
    onRed: oklch(0.2, 0.03, 22),
  };
}

// "Світанок": теплий кремовий папір, текст — темно-синє чорнило.
function light(ah: number): AppTheme {
  return {
    mode: 'light',
    bg: oklch(0.968, 0.011, 85),
    surface: oklch(0.99, 0.005, 85),
    surface2: oklch(0.94, 0.013, 85),
    elevated: '#ffffff',
    border: oklch(0.895, 0.014, 85),
    borderStrong: oklch(0.81, 0.02, 85),
    accent: oklch(0.5, 0.115, ah - 18),
    accentHi: oklch(0.6, 0.13, ah - 10),
    accentLo: oklch(0.42, 0.1, ah - 23),
    onAccent: '#ffffff',
    accent2: oklch(0.47, 0.15, 285),
    text: oklch(0.22, 0.03, 272),
    text2: oklch(0.37, 0.03, 272),
    muted: oklch(0.49, 0.025, 272),
    green: oklch(0.49, 0.11, 160),
    red: oklch(0.52, 0.17, 25),
    onRed: '#ffffff',
  };
}

// "Сутінки": посередині між опівніччю й світанком, текст значно світліший.
function gray(ah: number): AppTheme {
  return {
    mode: 'gray',
    bg: oklch(0.415, 0.018, 265),
    surface: oklch(0.455, 0.019, 265),
    surface2: oklch(0.5, 0.02, 265),
    elevated: oklch(0.48, 0.02, 265),
    border: oklch(0.54, 0.02, 265),
    borderStrong: oklch(0.62, 0.022, 265),
    accent: oklch(0.9, 0.1, ah + 6),
    accentHi: oklch(0.94, 0.075, ah + 10),
    accentLo: oklch(0.82, 0.12, ah - 2),
    onAccent: oklch(0.22, 0.03, ah - 18),
    accent2: oklch(0.9, 0.07, 290),
    text: oklch(0.99, 0.004, 85),
    text2: oklch(0.94, 0.01, 265),
    muted: oklch(0.89, 0.014, 265),
    green: oklch(0.92, 0.09, 160),
    red: oklch(0.89, 0.07, 22),
    onRed: oklch(0.22, 0.04, 22),
  };
}

const BUILDERS: Record<ThemeMode, (ah: number) => AppTheme> = { dark, light, gray };
const cache = new Map<string, AppTheme>();
export function buildTheme(mode: ThemeMode, accent: AccentKey): AppTheme {
  const key = `${mode}:${accent}`;
  let t = cache.get(key);
  if (!t) {
    t = BUILDERS[mode](ACCENT_HUES[accent]);
    cache.set(key, t);
  }
  return t;
}

// Кольори кружечків вибору акценту — як .accent-swatch на сайті (темна версія).
export function accentSwatch(accent: AccentKey): [string, string] {
  const ah = ACCENT_HUES[accent];
  return [oklch(0.88, 0.1, ah + 6), oklch(0.7, 0.13, ah - 10)];
}

// Шрифти як на сайті: Inter — інтерфейс, Playfair Display — заголовки/цифри.
// Старі імена FONT_MONO_* лишились (DM Mono не мав кирилиці, сайт перейшов
// на Inter) — тепер вони вказують на Inter, щоб не міняти кожен екран.
export const FONT_SERIF_REGULAR = 'PlayfairDisplay_700Bold';
export const FONT_SERIF_BOLD = 'PlayfairDisplay_800ExtraBold';
export const FONT_SERIF_BLACK = 'PlayfairDisplay_900Black';
export const FONT_SANS_REGULAR = 'Inter_400Regular';
export const FONT_SANS_MEDIUM = 'Inter_500Medium';
export const FONT_SANS_SEMIBOLD = 'Inter_600SemiBold';
export const FONT_SANS_BOLD = 'Inter_700Bold';
export const FONT_MONO_LIGHT = FONT_SANS_REGULAR;
export const FONT_MONO_REGULAR = FONT_SANS_REGULAR;
export const FONT_MONO_MEDIUM = FONT_SANS_MEDIUM;

// --radius-sm / --radius / --radius-lg із сайту.
export const RADIUS = { sm: 8, md: 12, lg: 18, xl: 22, pill: 999 };
export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };
// Єдина висота полів і кнопок-іконок у рядках фільтрів/форм — щоб усе стояло рівно.
export const CONTROL_HEIGHT = 48;

// Висота міні-плеєра (картка з обкладинкою, як .player-bar на телефоні).
export const PLAYER_BAR_HEIGHT = 90;
