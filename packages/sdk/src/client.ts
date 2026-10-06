/**
 * Типізований клієнт API. Методи генеруються з таблиці контрактів:
 *   const api = createClient({ baseUrl }).api;
 *   const track = await api.tracks.get({ params: { id } });
 * Типи входу й відповіді — ті самі, що валідує сервер.
 */
import {
  buildPath,
  buildQuery,
  type EndpointDef,
  type EndpointInput,
  type EndpointOutput,
  type Endpoints,
  endpoints,
  type IsInputOptional,
  type Problem,
} from "@musicdb/contracts/client";

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly problem: Problem | null;

  constructor(status: number, problem: Problem | null, fallback: string) {
    super(problem?.title ?? fallback);
    this.status = status;
    this.code = problem?.code ?? (status === 0 ? "network_error" : "http_error");
    this.problem = problem;
  }

  /** Помилка поля форми (path на зразок "body.title"). */
  fieldError(field: string) {
    return this.problem?.errors?.find((e) => e.path === `body.${field}` || e.path === field)?.message;
  }
}

export type ClientOptions = {
  baseUrl: string;
  fetch?: typeof fetch;
  /** Додаткові заголовки на кожен запит (Bearer-токен, мова, cookie на мобільному). */
  headers?: () => Record<string, string> | Promise<Record<string, string>>;
  /** include — для сайту (cookie-сесія на сусідньому піддомені). */
  credentials?: "include" | "same-origin" | "omit";
  onUnauthorized?: () => void;
};

type CallInit = { signal?: AbortSignal };

export type EndpointFn<E extends EndpointDef> =
  IsInputOptional<E> extends true
    ? (input?: EndpointInput<E>, init?: CallInit) => Promise<EndpointOutput<E>>
    : (input: EndpointInput<E>, init?: CallInit) => Promise<EndpointOutput<E>>;

export type Api = {
  [G in keyof Endpoints]: { [K in keyof Endpoints[G]]: EndpointFn<Endpoints[G][K] & EndpointDef> };
};

export function createClient(options: ClientOptions) {
  const doFetch = options.fetch ?? fetch;
  const base = options.baseUrl.replace(/\/$/, "");

  async function call<E extends EndpointDef>(
    e: E,
    input?: EndpointInput<E>,
    init?: CallInit,
  ): Promise<EndpointOutput<E>> {
    const params = (input?.params ?? undefined) as Record<string, string> | undefined;
    const query = (input?.query ?? undefined) as Record<string, unknown> | undefined;
    const url = `${base}${buildPath(e.path, params)}${buildQuery(query)}`;
    const headers: Record<string, string> = { accept: "application/json", ...(await options.headers?.()) };
    let body: string | undefined;
    if (input?.body !== undefined) {
      headers["content-type"] = "application/json";
      body = JSON.stringify(input.body);
    }
    let res: Response;
    try {
      res = await doFetch(url, {
        method: e.method,
        headers,
        ...(body !== undefined ? { body } : {}),
        ...(options.credentials ? { credentials: options.credentials } : {}),
        ...(init?.signal ? { signal: init.signal } : {}),
      });
    } catch (err) {
      if ((err as Error).name === "AbortError") throw err;
      throw new ApiError(0, null, "Немає з'єднання з сервером");
    }
    if (res.status === 204) return undefined as EndpointOutput<E>;
    const text = await res.text();
    const data = text ? (JSON.parse(text) as unknown) : undefined;
    if (!res.ok) {
      if (res.status === 401) options.onUnauthorized?.();
      throw new ApiError(res.status, (data as Problem) ?? null, `HTTP ${res.status}`);
    }
    return data as EndpointOutput<E>;
  }

  const api = {} as Record<string, Record<string, unknown>>;
  for (const [group, defs] of Object.entries(endpoints)) {
    api[group] = {};
    for (const [name, def] of Object.entries(defs)) {
      api[group][name] = (input?: EndpointInput<EndpointDef>, init?: CallInit) =>
        call(def as EndpointDef, input, init);
    }
  }

  return { call, api: api as unknown as Api, baseUrl: base };
}

export type Client = ReturnType<typeof createClient>;
