import { createClient } from "@musicdb/sdk";

/** Клієнт для браузера: той самий origin (/v1 проксіюється на API), cookie-сесія. */
export const client = createClient({
  baseUrl: typeof window === "undefined" ? (process.env.API_INTERNAL_URL ?? "http://localhost:8787") : "",
  credentials: "same-origin",
  headers: (): Record<string, string> =>
    typeof document !== "undefined" ? { "accept-language": document.documentElement.lang || "uk" } : {},
});

export const api = client.api;

export const realtimeUrl = () =>
  process.env.NEXT_PUBLIC_REALTIME_URL ??
  (typeof window !== "undefined"
    ? `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}/v1/realtime`
    : "");
