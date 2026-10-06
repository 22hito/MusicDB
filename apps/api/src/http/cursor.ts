/** Курсори пагінації — непрозорий base64url-JSON, щоб клієнти не залежали від внутрішньої форми. */
export function encodeCursor(value: unknown): string {
  return Buffer.from(JSON.stringify(value)).toString("base64url");
}

export function decodeCursor<T>(cursor: string | undefined): T | null {
  if (!cursor) return null;
  try {
    return JSON.parse(Buffer.from(cursor, "base64url").toString("utf8")) as T;
  } catch {
    return null;
  }
}

/** Offset-курсор для сортувань, де keyset незручний (каталог невеликий). */
export function offsetPage<T>(rows: T[], offset: number, limit: number) {
  const hasMore = rows.length > limit;
  return {
    items: hasMore ? rows.slice(0, limit) : rows,
    nextCursor: hasMore ? encodeCursor({ o: offset + limit }) : null,
  };
}

export function readOffset(cursor: string | undefined): number {
  const c = decodeCursor<{ o?: number }>(cursor);
  return c?.o && Number.isInteger(c.o) && c.o > 0 ? c.o : 0;
}
