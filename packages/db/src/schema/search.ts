/**
 * Пошуковий індекс: по рядку на сутність (трек, виконавець, реліз, плейлист, людина, жанр).
 * Повнотекстовий пошук (tsvector, конфігурація simple — назви бувають будь-якою мовою)
 * плюс триграми для одруківок і пошуку за частиною слова.
 */
import { customType, index, pgTable, primaryKey, real, text } from "drizzle-orm/pg-core";

const tsvector = customType<{ data: string }>({
  dataType: () => "tsvector",
});

export const searchDocuments = pgTable(
  "search_documents",
  {
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    title: text("title").notNull(),
    subtitle: text("subtitle"),
    imageUrl: text("image_url"),
    /** Нормалізований текст: нижній регістр, без діакритики (для триграм). */
    normalized: text("normalized").notNull(),
    document: tsvector("document").notNull(),
    /** Популярність 0..1 — підмішується до релевантності. */
    popularity: real("popularity").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.entityType, t.entityId] }),
    index("search_documents_document_idx").using("gin", t.document),
    index("search_documents_trgm_idx").using("gin", t.normalized.op("gin_trgm_ops")),
  ],
);
