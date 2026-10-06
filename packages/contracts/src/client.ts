/**
 * Легкий вхід контрактів для клієнтів (сайт, застосунок, SDK): ті самі типи, але без zod-схем у бандлі.
 * Під час роботи клієнтам потрібні лише метод і шлях ендпоінта — їх дає згенерована таблиця маршрутів;
 * валідацію за схемами робить сервер (повний вхід `@musicdb/contracts`).
 */
import type { Endpoints } from "./endpoints";
import { routes } from "./routes.generated";

export { buildPath, buildQuery } from "./endpoint";
export type * from "./index";

/** Таблиця ендпоінтів: типи — повні (вхід і відповідь), значення — лише метод і шлях. */
export const endpoints = routes as unknown as Endpoints;
