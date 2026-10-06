import { endpoints } from "@musicdb/contracts";
import { endpoints as clientEndpoints } from "@musicdb/contracts/client";
import { describe, expect, it } from "vitest";

describe("легка таблиця маршрутів для клієнтів", () => {
  it("збігається з контрактами (інакше: pnpm --filter @musicdb/contracts gen)", () => {
    const pick = (table: object) =>
      Object.fromEntries(
        Object.entries(table).map(([g, defs]) => [
          g,
          Object.fromEntries(
            Object.entries(defs as Record<string, { method: string; path: string }>).map(([n, d]) => [
              n,
              `${d.method} ${d.path}`,
            ]),
          ),
        ]),
      );
    expect(pick(clientEndpoints)).toEqual(pick(endpoints));
  });
});
