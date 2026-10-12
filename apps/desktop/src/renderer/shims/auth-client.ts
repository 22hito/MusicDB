/**
 * Клієнт входу для застосунку. better-auth приймає лише http(s)-адресу, тож формально — адреса сайту,
 * а запити йдуть відносно (app://nowl/v1/auth/…) — їх пересилає головний процес зі своєю сесією.
 */
import { createAuthClient } from "better-auth/react";

const SITE = "https://nowl.pp.ua";

export const authClient = createAuthClient({
  baseURL: SITE,
  basePath: "/v1/auth",
  fetchOptions: {
    customFetchImpl: (input: RequestInfo | URL, init?: RequestInit) => {
      const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      return fetch(url.startsWith(SITE) ? url.slice(SITE.length) : url, init);
    },
  },
});
