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

/** Вбудований API (Vercel, EMBEDDED_API=1): виклик у тому самому процесі, без мережі. */
async function embeddedFetch(): Promise<typeof fetch | undefined> {
  if (!process.env.EMBEDDED_API) return undefined;
  const { handleApiRequest } = await import("@musicdb/api/vercel");
  return (async (input: RequestInfo | URL, init?: RequestInit) =>
    handleApiRequest(new Request(input, init))) as typeof fetch;
}

/** Клієнт API для серверних компонентів: напряму до API, з cookie користувача. */
export const serverApi = cache(async () => {
  const jar = await cookies();
  const locale = await getLocale();
  const inProcess = await embeddedFetch();
  return createClient({
    baseUrl: inProcess ? "http://embedded.local" : (process.env.API_INTERNAL_URL ?? "http://localhost:8787"),
    ...(inProcess ? { fetch: inProcess } : {}),
    headers: () => ({ cookie: jar.toString(), "accept-language": locale }),
  }).api;
});
