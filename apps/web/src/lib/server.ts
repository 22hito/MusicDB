import "server-only";
import { createTranslator, detectLocale, type Locale } from "@musicdb/i18n";
import { createClient } from "@musicdb/sdk";
import { cookies, headers } from "next/headers";
import { cache } from "react";

export const getLocale = cache(async (): Promise<Locale> => {
  const jar = await cookies();
  const fromCookie = jar.get("nowl-locale")?.value;
  if (fromCookie === "uk" || fromCookie === "en") return fromCookie;
  return detectLocale((await headers()).get("accept-language"));
});

export const getT = cache(async () => createTranslator(await getLocale()));

/** Клієнт API для серверних компонентів: напряму до API, з cookie користувача. */
export const serverApi = cache(async () => {
  const jar = await cookies();
  const locale = await getLocale();
  return createClient({
    baseUrl: process.env.API_INTERNAL_URL ?? "http://localhost:8787",
    headers: () => ({ cookie: jar.toString(), "accept-language": locale }),
  }).api;
});
