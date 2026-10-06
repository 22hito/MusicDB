import type { Locale } from "@musicdb/i18n";

let current: Locale = "uk";
export const getLocale = () => current;
export const setLocaleValue = (l: Locale) => {
  current = l;
};
