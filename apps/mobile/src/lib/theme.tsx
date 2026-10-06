/**
 * Тема застосунку з тих самих токенів, що й сайт: кольори, акцент, відступи, шрифти.
 */
import { createTranslator, type Locale, type Translate } from "@musicdb/i18n";
import {
  type AccentName,
  getTheme,
  normalizeAccent,
  radius,
  type Theme,
  type ThemeName,
} from "@musicdb/tokens";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from "react";
import { useColorScheme } from "react-native";
import { setLocaleValue } from "./locale";

export type ThemeSetting = ThemeName | "system";

export type MotionSetting = "system" | "full" | "reduced";
type Prefs = { theme: ThemeSetting; accent: AccentName; locale: Locale; motion: MotionSetting };

type Ctx = Prefs & {
  t: Translate;
  colors: Theme["colors"];
  dark: boolean;
  setPrefs: (patch: Partial<Prefs>) => void;
};

const PrefsContext = createContext<Ctx | null>(null);
const KEY = "nowl-prefs";

export function PrefsProvider({ children }: { children: ReactNode }) {
  const system = useColorScheme();
  const [prefs, setState] = useState<Prefs>({
    theme: "dark",
    accent: "amber",
    locale: "uk",
    motion: "system",
  });

  useEffect(() => {
    AsyncStorage.getItem(KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw) as Partial<Prefs>;
        // Назви акцентів ранньої v2 (violet, sky) → v1 (lavender, ocean).
        setState((p) => ({ ...p, ...saved, accent: normalizeAccent(saved.accent) }));
      })
      .catch(() => {});
  }, []);

  const value = useMemo<Ctx>(() => {
    const name: ThemeName = prefs.theme === "system" ? (system === "light" ? "light" : "dark") : prefs.theme;
    setLocaleValue(prefs.locale);
    return {
      ...prefs,
      dark: name !== "light",
      colors: getTheme(name, prefs.accent).colors,
      t: createTranslator(prefs.locale),
      setPrefs: (patch) =>
        setState((p) => {
          const next = { ...p, ...patch };
          void AsyncStorage.setItem(KEY, JSON.stringify(next));
          return next;
        }),
    };
  }, [prefs, system]);

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
}

export function usePrefs() {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error("PrefsProvider відсутній");
  return ctx;
}

export const useT = () => usePrefs().t;
export const useColors = () => usePrefs().colors;

export const fonts = {
  regular: "Inter_400Regular",
  medium: "Inter_500Medium",
  semibold: "Inter_600SemiBold",
  bold: "Inter_700Bold",
  extrabold: "Inter_800ExtraBold",
  black: "Inter_900Black",
  /** Фірмовий серифний шрифт v1: заголовки, логотип, великі числа. */
  serif: "PlayfairDisplay_700Bold",
  serifSemibold: "PlayfairDisplay_600SemiBold",
  serifItalic: "PlayfairDisplay_600SemiBold_Italic",
} as const;

export { radius };
