import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { I18N, type Lang } from '@/constants/i18n';
import { ACCENT_HUES, buildTheme, type AccentKey, type AppTheme, type ThemePref } from '@/constants/theme';

const KEY_API_BASE = 'musicdb.apiBase';
const KEY_THEME = 'musicdb.theme';
const KEY_LANG = 'musicdb.lang';
const KEY_START_TAB = 'musicdb.startTab';
// Вкладка, що відкривається під час запуску (як «Стартова сторінка» на сайті).
export type StartTab = 'index' | 'top' | 'community' | 'explore';
const START_TABS: StartTab[] = ['index', 'top', 'community', 'explore'];
const KEY_ACCENT = 'musicdb.accent';

// Той самий бекенд, що й у веб- і десктоп-версіях — застосунок працює "з коробки".
// Звичайним користувачам адреса сервера не потрібна, тож в інтерфейсі її немає;
// для розробки з локальним бекендом: EXPO_PUBLIC_API_BASE=http://192.168.x.x:5000 npx expo start
const DEFAULT_API_BASE = 'https://musicdb-b5c4grhhdjdjd5gv.polandcentral-01.azurewebsites.net';
const API_BASE = (process.env.EXPO_PUBLIC_API_BASE || DEFAULT_API_BASE).replace(/\/+$/, '');

interface SettingsState {
  ready: boolean;
  apiBase: string | null;
  theme: AppTheme;
  themeMode: ThemePref; // вибір користувача ('system' — за темою телефона)
  setThemeMode: (mode: ThemePref) => void;
  accent: AccentKey; // акцентний колір — 6 пресетів, як на сайті
  setAccent: (accent: AccentKey) => void;
  lang: Lang;
  setLang: (lang: Lang) => void;
  startTab: StartTab;
  setStartTab: (tab: StartTab) => void;
  t: (key: keyof typeof I18N['uk'], vars?: Record<string, string | number>) => string;
  // Число з правильною формою слова: «1 пісня», «23 пісні», «25 пісень» (ключі count.*: «одна|кілька|багато»).
  count: (key: keyof typeof I18N['uk'], n: number) => string;
}

const SettingsContext = createContext<SettingsState | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [ready, setReady] = useState(false);
  const apiBase: string | null = API_BASE;
  const [themeMode, setThemeModeState] = useState<ThemePref>('system');
  const [accent, setAccentState] = useState<AccentKey>('amber');
  const [lang, setLangState] = useState<Lang>('uk');
  const [startTab, setStartTabState] = useState<StartTab>('index');

  useEffect(() => {
    (async () => {
      try {
        // Раніше адресу можна було змінити вручну — прибираємо старе збережене значення.
        AsyncStorage.removeItem(KEY_API_BASE).catch(() => {});
        const [savedTheme, savedLang, savedAccent, savedStart] = await Promise.all([
          AsyncStorage.getItem(KEY_THEME),
          AsyncStorage.getItem(KEY_LANG),
          AsyncStorage.getItem(KEY_ACCENT),
          AsyncStorage.getItem(KEY_START_TAB),
        ]);
        if (savedStart && (START_TABS as string[]).includes(savedStart)) setStartTabState(savedStart as StartTab);
        if (savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'gray' || savedTheme === 'system') setThemeModeState(savedTheme);
        if (savedAccent && savedAccent in ACCENT_HUES) setAccentState(savedAccent as AccentKey);
        if (savedLang === 'uk' || savedLang === 'en') setLangState(savedLang);
      } finally {
        setReady(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setAccent = useCallback((next: AccentKey) => {
    setAccentState(next);
    AsyncStorage.setItem(KEY_ACCENT, next).catch(() => {});
  }, []);

  const setThemeMode = useCallback((mode: ThemePref) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(KEY_THEME, mode).catch(() => {});
  }, []);

  const setStartTab = useCallback((next: StartTab) => {
    setStartTabState(next);
    AsyncStorage.setItem(KEY_START_TAB, next).catch(() => {});
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    AsyncStorage.setItem(KEY_LANG, next).catch(() => {});
  }, []);

  const t = useCallback(
    (key: keyof typeof I18N['uk'], vars?: Record<string, string | number>) => {
      const dict = I18N[lang] as Record<string, string>;
      let str = dict[key as string] ?? (I18N.uk as Record<string, string>)[key as string] ?? String(key);
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          str = str.replace(`{${k}}`, String(v));
        }
      }
      return str;
    },
    [lang],
  );

  const count = useCallback(
    (key: keyof typeof I18N['uk'], n: number) => {
      const forms = t(key).split('|');
      const a = Math.abs(n);
      let i: number;
      if (lang === 'uk') {
        const d = a % 10;
        const h = a % 100;
        i = d === 1 && h !== 11 ? 0 : d >= 2 && d <= 4 && (h < 12 || h > 14) ? 1 : 2;
      } else {
        i = a === 1 ? 0 : 1;
      }
      return `${n} ${forms[Math.min(i, forms.length - 1)]}`;
    },
    [t, lang],
  );

  const value = useMemo<SettingsState>(
    () => ({
      ready,
      apiBase,
      theme: buildTheme(themeMode === 'system' ? (systemScheme === 'light' ? 'light' : 'dark') : themeMode, accent),
      themeMode,
      setThemeMode,
      accent,
      setAccent,
      lang,
      setLang,
      startTab,
      setStartTab,
      t,
      count,
    }),
    [
      ready,
      apiBase,
      themeMode,
      setThemeMode,
      accent,
      setAccent,
      systemScheme,
      lang,
      setLang,
      startTab,
      setStartTab,
      t,
      count,
    ],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsState {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
