"use client";
import { createTranslator, type Locale, type Translate } from "@musicdb/i18n";
import { createContext, type ReactNode, useContext, useMemo } from "react";
import { useSettings } from "./settings";

const I18nContext = createContext<{ locale: Locale; t: Translate } | null>(null);

export function I18nProvider({ initialLocale, children }: { initialLocale: Locale; children: ReactNode }) {
  const stored = useSettings((s) => s.locale);
  const locale = stored ?? initialLocale;
  const value = useMemo(() => ({ locale, t: createTranslator(locale) }), [locale]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("I18nProvider відсутній");
  return ctx;
}

export const useT = () => useI18n().t;
