import { z } from "zod";

export const Id = z.string().min(1).max(64);
export const IsoDateTime = z.string().meta({ format: "date-time" });
export const IsoDate = z.string().meta({ format: "date" });

export const LocalizedText = z
  .object({ uk: z.string().optional(), en: z.string().optional() })
  .meta({ id: "LocalizedText" });
export type LocalizedText = z.infer<typeof LocalizedText>;

/** Курсорна пагінація: стабільна при вставках, на відміну від offset. */
export const PageQuery = z.object({
  cursor: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(100).default(30),
});

export const page = <T extends z.ZodType>(item: T) =>
  z.object({
    items: z.array(item),
    nextCursor: z.string().nullable(),
  });

export type Page<T> = { items: T[]; nextCursor: string | null };

/** Помилка у форматі RFC 9457 (application/problem+json). code — стабільний машинний код для перекладу. */
export const Problem = z
  .object({
    type: z.string().default("about:blank"),
    title: z.string(),
    status: z.number().int(),
    code: z.string(),
    detail: z.string().optional(),
    errors: z.array(z.object({ path: z.string(), message: z.string() })).optional(),
  })
  .meta({ id: "Problem" });
export type Problem = z.infer<typeof Problem>;

export const Ok = z.object({ ok: z.literal(true) }).meta({ id: "Ok" });
