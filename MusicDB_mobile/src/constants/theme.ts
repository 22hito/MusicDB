// Кольори й типографіка перенесені 1:1 зі стилів веб-версії
// (MusicDB.Api/wwwroot/index.html, :root / html[data-theme="light"]).

export type ThemeMode = 'dark' | 'light';

export interface AppTheme {
  mode: ThemeMode;
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  accent: string;
  accent2: string;
  text: string;
  muted: string;
  green: string;
  red: string;
  onAccent: string; // текст на кнопках з фоном --accent (завжди темний, як у вебі)
}

const dark: AppTheme = {
  mode: 'dark',
  bg: '#0d0d0f',
  surface: '#141416',
  surface2: '#1c1c1f',
  border: '#2a2a2e',
  accent: '#c8a96e',
  accent2: '#7c6fcd',
  text: '#e8e8e0',
  muted: '#6b6b72',
  green: '#4caf7d',
  red: '#e05c5c',
  onAccent: '#0d0d0f',
};

const light: AppTheme = {
  mode: 'light',
  bg: '#f7f6f2',
  surface: '#ffffff',
  surface2: '#eef0ea',
  border: '#dcdcd4',
  accent: '#b8843c',
  accent2: '#6f5fb0',
  text: '#23231f',
  muted: '#6c6c68',
  green: '#29885e',
  red: '#c9455a',
  onAccent: '#ffffff',
};

export const THEMES: Record<ThemeMode, AppTheme> = { dark, light };

// Playfair Display (заголовки/бренд) + DM Mono (усе інше) — ті самі
// Google Fonts, що й у вебі, підвантажені через @expo-google-fonts/*.
export const FONT_SERIF_REGULAR = 'PlayfairDisplay_400Regular';
export const FONT_SERIF_BOLD = 'PlayfairDisplay_700Bold';
export const FONT_SERIF_BLACK = 'PlayfairDisplay_900Black';
export const FONT_MONO_LIGHT = 'DMMono_300Light';
export const FONT_MONO_REGULAR = 'DMMono_400Regular';
export const FONT_MONO_MEDIUM = 'DMMono_500Medium';

export const RADIUS = { sm: 6, md: 8, lg: 10, xl: 12, pill: 999 };
export const SPACING = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 28 };

// Висота міні-плеєра — менше, ніж --player-h: 88px у вебі, але з запасом під
// зону дотику кнопок shuffle/repeat/відео/закрити.
export const PLAYER_BAR_HEIGHT = 80;
