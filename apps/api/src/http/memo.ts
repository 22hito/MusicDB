/**
 * Короткий кеш у пам'яті процесу для важких агрегатів по всьому каталогу (статистика, «Машина часу»):
 * дані змінюються рідко, а рахувати їх на кожен запит — зайве навантаження на базу.
 * Одночасні запити до порожнього ключа чекають одного обчислення.
 */
const store = new Map<string, { at: number; value: Promise<unknown> }>();

export function memo<T>(key: string, ttlMs: number, compute: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.value as Promise<T>;
  const value = compute().catch((err) => {
    store.delete(key);
    throw err;
  });
  store.set(key, { at: Date.now(), value });
  if (store.size > 500) store.delete(store.keys().next().value!);
  return value;
}

/** Скинути кеш (після змін каталогу адміном чи в тестах). */
export function clearMemo(prefix = "") {
  for (const k of store.keys()) if (k.startsWith(prefix)) store.delete(k);
}
