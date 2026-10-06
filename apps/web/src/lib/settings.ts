"use client";
import type { Locale } from "@musicdb/i18n";
import type { AccentName } from "@musicdb/tokens";
import { create } from "zustand";

export type ThemeSetting = "dark" | "gray" | "light" | "system";
export type MotionSetting = "system" | "full" | "reduced";

type Settings = {
  theme: ThemeSetting;
  accent: AccentName;
  locale: Locale;
  motion: MotionSetting;
  setTheme(theme: ThemeSetting): void;
  setMotion(motion: MotionSetting): void;
  setAccent(accent: AccentName): void;
  setLocale(locale: Locale): void;
};

function writeCookie(name: string, value: string) {
  // biome-ignore lint/suspicious/noDocumentCookie: налаштування читає сервер — для рендеру без «блимання»
  document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
}

/** Початкові значення приходять із серверного рендеру (атрибути <html>). */
function initial(): Pick<Settings, "theme" | "accent" | "locale" | "motion"> {
  if (typeof document === "undefined")
    return { theme: "dark", accent: "amber", locale: "uk", motion: "system" };
  const el = document.documentElement;
  return {
    theme: (el.dataset.theme as ThemeSetting) ?? "dark",
    accent: (el.dataset.accent as AccentName) ?? "amber",
    locale: (el.lang as Locale) ?? "uk",
    motion: (el.dataset.motion as MotionSetting) ?? "system",
  };
}

export const useSettings = create<Settings>()((set) => ({
  ...initial(),
  setTheme(theme) {
    document.documentElement.dataset.theme = theme;
    writeCookie("nowl-theme", theme);
    set({ theme });
  },
  setAccent(accent) {
    document.documentElement.dataset.accent = accent;
    writeCookie("nowl-accent", accent);
    set({ accent });
  },
  setMotion(motion) {
    document.documentElement.dataset.motion = motion;
    writeCookie("nowl-motion", motion);
    set({ motion });
  },
  setLocale(locale) {
    document.documentElement.lang = locale;
    writeCookie("nowl-locale", locale);
    set({ locale });
  },
}));
