import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useApiBridge } from '@/api/ApiBridge';
import { useMusicApi } from '@/api/endpoints';

interface FavoritesState {
  favoriteIds: Set<number>;
  loaded: boolean;
  toggleFavorite: (musicId: number) => Promise<void>;
  reload: () => Promise<void>;
}

const FavoritesCtx = createContext<FavoritesState | null>(null);

export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const { currentUser } = useApiBridge();
  const api = useMusicApi();
  const [favoriteIds, setFavoriteIds] = useState<Set<number>>(new Set());
  const [loaded, setLoaded] = useState(false);

  const reload = useCallback(async () => {
    if (!currentUser?.authenticated) {
      setFavoriteIds(new Set());
      setLoaded(true);
      return;
    }
    try {
      const list = await api.getFavorites();
      setFavoriteIds(new Set(list.map((s) => s.id)));
    } catch {
      setFavoriteIds(new Set());
    } finally {
      setLoaded(true);
    }
  }, [currentUser?.authenticated, api]);

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.authenticated]);

  const toggleFavorite = useCallback(
    async (musicId: number) => {
      const isFav = favoriteIds.has(musicId);
      setFavoriteIds((prev) => {
        const next = new Set(prev);
        if (isFav) next.delete(musicId);
        else next.add(musicId);
        return next;
      });
      try {
        if (isFav) await api.removeFavorite(musicId);
        else await api.addFavorite(musicId);
      } catch {
        // повертаємо назад, якщо запит не вдався
        setFavoriteIds((prev) => {
          const next = new Set(prev);
          if (isFav) next.add(musicId);
          else next.delete(musicId);
          return next;
        });
      }
    },
    [favoriteIds, api],
  );

  const value = useMemo(() => ({ favoriteIds, loaded, toggleFavorite, reload }), [favoriteIds, loaded, toggleFavorite, reload]);

  return <FavoritesCtx.Provider value={value}>{children}</FavoritesCtx.Provider>;
}

export function useFavorites(): FavoritesState {
  const ctx = useContext(FavoritesCtx);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
}
