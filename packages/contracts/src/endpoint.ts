import type { z } from "zod";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * public — доступно всім; optional — без входу теж, але відповідь залежить від користувача;
 * user — потрібен вхід; moderator/admin — роль.
 */
export type AuthLevel = "public" | "optional" | "user" | "moderator" | "admin";

// biome-ignore lint/suspicious/noExplicitAny: будь-яка об'єктна схема
type ObjectSchema = z.ZodObject<any>;

export interface EndpointDef {
  method: HttpMethod;
  /** Шлях у стилі Hono: /v1/tracks/:id */
  path: `/${string}`;
  summary: string;
  tag: string;
  auth: AuthLevel;
  params?: ObjectSchema;
  query?: ObjectSchema;
  body?: z.ZodType;
  /** Немає схеми — відповідь 204 без тіла. */
  response?: z.ZodType;
  status?: 200 | 201 | 202;
  /** Скільки секунд відповідь можна кешувати публічно (CDN). */
  cacheSeconds?: number;
}

export const endpoint = <const E extends EndpointDef>(e: E): E => e;

type Has<T, K extends PropertyKey> = K extends keyof T ? (T[K] extends z.ZodType ? true : false) : false;

export type EndpointInput<E extends EndpointDef> = (Has<E, "params"> extends true
  ? { params: z.input<NonNullable<E["params"]>> }
  : { params?: undefined }) &
  (Has<E, "query"> extends true ? { query?: z.input<NonNullable<E["query"]>> } : { query?: undefined }) &
  (Has<E, "body"> extends true ? { body: z.input<NonNullable<E["body"]>> } : { body?: undefined });

/** Тип відповіді; ендпоінт без тіла (204) повертає void. */
export type EndpointOutput<E extends EndpointDef> =
  // biome-ignore lint/suspicious/noConfusingVoidType: void тут — відсутність тіла відповіді
  Has<E, "response"> extends true ? z.output<NonNullable<E["response"]>> : void;

/** Чи можна викликати ендпоінт без аргументів (немає обов'язкових params/body). */
export type IsInputOptional<E extends EndpointDef> =
  Has<E, "params"> extends true ? false : Has<E, "body"> extends true ? false : true;

export type ParsedParams<E extends EndpointDef> =
  Has<E, "params"> extends true ? z.output<NonNullable<E["params"]>> : Record<string, never>;
export type ParsedQuery<E extends EndpointDef> =
  Has<E, "query"> extends true ? z.output<NonNullable<E["query"]>> : Record<string, never>;
export type ParsedBody<E extends EndpointDef> =
  Has<E, "body"> extends true ? z.output<NonNullable<E["body"]>> : undefined;

/** Підставляє params у шлях: /v1/tracks/:id + {id: "x"} → /v1/tracks/x */
export function buildPath(path: string, params?: Record<string, string | number>): string {
  if (!params) return path;
  return path.replace(/:([A-Za-z0-9_]+)/g, (_, key: string) => {
    const value = params[key];
    if (value === undefined) throw new Error(`Missing path param "${key}" for ${path}`);
    return encodeURIComponent(String(value));
  });
}

export function buildQuery(query?: Record<string, unknown>): string {
  if (!query) return "";
  const parts: string[] = [];
  for (const [key, value] of Object.entries(query)) {
    if (value === undefined || value === null || value === "") continue;
    const text = Array.isArray(value) ? value.join(",") : String(value);
    parts.push(`${encodeURIComponent(key)}=${encodeURIComponent(text)}`);
  }
  return parts.length ? `?${parts.join("&")}` : "";
}
