/**
 * Генерує src/routes.generated.ts — таблицю «група → ендпоінт → метод і шлях» без zod.
 * Її використовують клієнти (сайт, застосунок, SDK): у браузер не потрапляють схеми валідації.
 * Запуск: pnpm --filter @musicdb/contracts gen. Тест в apps/api перевіряє, що таблиця актуальна.
 */
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { endpoints } from "../src/endpoints";

const lines = ["// Згенеровано scripts/gen-routes.ts — не редагувати вручну.", "export const routes = {"];
for (const [group, defs] of Object.entries(endpoints)) {
  lines.push(`  ${group}: {`);
  for (const [name, def] of Object.entries(defs as Record<string, { method: string; path: string }>)) {
    lines.push(`    ${name}: { method: "${def.method}", path: "${def.path}" },`);
  }
  lines.push("  },");
}
lines.push("} as const;", "");
writeFileSync(join(import.meta.dirname, "..", "src", "routes.generated.ts"), lines.join("\n"));
console.log("routes.generated.ts оновлено");
