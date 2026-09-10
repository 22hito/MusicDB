import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useColorScheme } from 'react-native';
import { I18N, type Lang } from '@/constants/i18n';
import { THEMES, type AppTheme, type ThemeMode } from '@/constants/theme';

const KEY_API_BASE = 'musicdb.apiBase';
const KEY_THEME = 'musicdb.theme';
const KEY_LANG = 'musicdb.lang';

function normalizeBaseUrl(raw: string): string | null {
  let v = raw.trim();
  if (!v) return null;
  // Локальні бекенди для розробки (IP у Wi-Fi) майже завжди http без TLS —
  // якщо схему не вказано, додаємо http://, інакше ERR_CONNECTION_REFUSED.
  if (!/^https?:\/\//i.test(v)) v = 'http://' + v;
  try {
    const u = new URL(v);
    // прибираємо кінцевий "/" — усі ендпоінти самі додають потрібний шлях
    return u.origin + (u.pathname === '/' ? '' : u.pathname.replace(/\/+$/, ''));
  } catch {
    return null;
  }
}

interface SettingsState {
  ready: boolean;
  apiBase: string | null;
  setApiBase: (raw: string) => Promise<boolean>;
  clearApiBase: () => Promise<void>;
  theme: AppTheme;
  themeMode: ThemeMode;
  setThemeMode: (mode: ThemeMode) => void;
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: keyof typeof I18N['uk'], vars?: Record<string, string | number>) => string;
}

const SettingsContext = createContext<SettingsState | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [ready, setReady] = useState(false);
  const [apiBase, setApiBaseState] = useState<string | null>(null);
  const [themeMode, setThemeModeState] = useState<ThemeMode>('dark');
  const [lang, setLangState] = useState<Lang>('uk');

  useEffect(() => {
    (async () => {
      try {
        const [savedBase, savedTheme, savedLang] = await Promise.all([
          AsyncStorage.getItem(KEY_API_BASE),
          AsyncStorage.getItem(KEY_THEME),
          AsyncStorage.getItem(KEY_LANG),
        ]);
        if (savedBase) setApiBaseState(savedBase);
        if (savedTheme === 'dark' || savedTheme === 'light' || savedTheme === 'gray') setThemeModeState(savedTheme);
        else if (systemScheme === 'light') setThemeModeState('light');
        if (savedLang === 'uk' || savedLang === 'en') setLangState(savedLang);
      } finally {
        setReady(true);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setApiBase = useCallback(async (raw: string) => {
    const normalized = normalizeBaseUrl(raw);
    if (!normalized) return false;
    setApiBaseState(normalized);
    await AsyncStorage.setItem(KEY_API_BASE, normalized);
    return true;
  }, []);

  const clearApiBase = useCallback(async () => {
    setApiBaseState(null);
    await AsyncStorage.removeItem(KEY_API_BASE);
  }, []);

  const setThemeMode = useCallback((mode: ThemeMode) => {
    setThemeModeState(mode);
    AsyncStorage.setItem(KEY_THEME, mode).catch(() => {});
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

  const value = useMemo<SettingsState>(
    () => ({
      ready,
      apiBase,
      setApiBase,
      clearApiBase,
      theme: THEMES[themeMode],
      themeMode,
      setThemeMode,
      lang,
      setLang,
      t,
    }),
    [ready, apiBase, setApiBase, clearApiBase, themeMode, setThemeMode, lang, setLang, t],
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsState {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within SettingsProvider');
  return ctx;
}
