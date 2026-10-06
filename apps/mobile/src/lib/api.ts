import { createClient } from "@musicdb/sdk";
import { sessionCookie } from "./auth";
import { API_URL } from "./config";
import { getLocale } from "./locale";

export const client = createClient({
  baseUrl: API_URL,
  headers: async () => {
    const cookie = await sessionCookie();
    return { "accept-language": getLocale(), ...(cookie ? { cookie } : {}) };
  },
});

export const api = client.api;
