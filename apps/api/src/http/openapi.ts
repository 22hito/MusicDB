/** OpenAPI 3.1 з таблиці контрактів — документація /docs і генерація клієнтів для сторонніх розробників. */
import { type EndpointDef, Problem } from "@musicdb/contracts";
import { createDocument } from "zod-openapi";
import type { Implementation } from "./endpoint";

const authText: Record<EndpointDef["auth"], string> = {
  public: "",
  optional: "Вхід не обов'язковий; з ним відповідь персоналізована.",
  user: "Потрібен вхід.",
  moderator: "Лише модератори й адміністратори.",
  admin: "Лише адміністратори.",
};

export function buildOpenApi(impls: Implementation[], serverUrl: string) {
  // biome-ignore lint/suspicious/noExplicitAny: структура OpenAPI будується динамічно
  const paths: Record<string, Record<string, any>> = {};
  for (const { endpoint: e } of impls) {
    const path = e.path.replace(/:([A-Za-z0-9_]+)/g, "{$1}");
    const status = String(e.response ? (e.status ?? 200) : 204);
    paths[path] ??= {};
    paths[path][e.method.toLowerCase()] = {
      summary: e.summary,
      ...(authText[e.auth] ? { description: authText[e.auth] } : {}),
      tags: [e.tag],
      ...(e.auth !== "public"
        ? { security: e.auth === "optional" ? [{}, { session: [] }] : [{ session: [] }] }
        : {}),
      requestParams: {
        ...(e.params ? { path: e.params } : {}),
        ...(e.query ? { query: e.query } : {}),
      },
      ...(e.body ? { requestBody: { content: { "application/json": { schema: e.body } } } } : {}),
      responses: {
        [status]: e.response
          ? { description: "OK", content: { "application/json": { schema: e.response } } }
          : { description: "Без вмісту" },
        default: { description: "Помилка", content: { "application/problem+json": { schema: Problem } } },
      },
    };
  }
  return createDocument({
    openapi: "3.1.0",
    info: {
      title: "N'Owl API",
      version: "1.0.0",
      description:
        "Публічний API платформи N'Owl. Автентифікація — cookie-сесія (сайт) або `Authorization: Bearer <token>` (застосунки). Помилки — RFC 9457.",
    },
    servers: [{ url: serverUrl }],
    components: {
      securitySchemes: {
        session: { type: "http", scheme: "bearer", description: "Токен сесії з /v1/auth" },
      },
    },
    paths,
  });
}
