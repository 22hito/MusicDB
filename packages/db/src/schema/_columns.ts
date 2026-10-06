import { text, timestamp } from "drizzle-orm/pg-core";
import { newId } from "../ids";

export const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => newId());

export const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const updatedAt = () =>
  timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date());

export const ts = (name: string) => timestamp(name, { withTimezone: true });

/** Текст кількома мовами: { uk: "…", en: "…" }. */
export type LocalizedText = Partial<Record<"uk" | "en", string>>;
