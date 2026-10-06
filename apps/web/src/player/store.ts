"use client";
import { createPlayerStore, type PlayerActions, type PlayerState } from "@musicdb/player";
import { useStore } from "zustand";
import { api } from "@/lib/api";

const STORAGE_KEY = "nowl-player";

/** Один плеєр на вкладку: стан живе поза React, тож переходи між сторінками його не скидають. */
export const playerStore = createPlayerStore({
  report: (trackId, msPlayed, context) => {
    void api.library
      .reportPlay({
        body: {
          trackId,
          msPlayed,
          platform: "web",
          ...(context ? { context: { type: context.type, ...(context.id ? { id: context.id } : {}) } } : {}),
        },
      })
      .catch(() => {});
  },
  fetchRadio: async (seed, exclude) =>
    (await api.tracks.radio({ params: { id: seed.id }, query: { limit: 25, exclude: exclude.slice(-200) } }))
      .items,
});

export function usePlayer<T>(selector: (s: PlayerState & PlayerActions) => T): T {
  return useStore(playerStore, selector);
}

/** Зберігає гучність і налаштування між сесіями (не чергу — вона прив'язана до контексту). */
if (typeof window !== "undefined") {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<PlayerState>;
    playerStore.setState({
      ...(typeof saved.volume === "number" ? { volume: saved.volume } : {}),
      ...(typeof saved.muted === "boolean" ? { muted: saved.muted } : {}),
      ...(saved.repeat ? { repeat: saved.repeat } : {}),
      ...(typeof saved.autoplay === "boolean" ? { autoplay: saved.autoplay } : {}),
      ...(typeof saved.normalize === "boolean" ? { normalize: saved.normalize } : {}),
    });
  } catch {
    // пошкоджене збереження — ігноруємо
  }
  playerStore.subscribe((s, prev) => {
    if (
      s.volume !== prev.volume ||
      s.muted !== prev.muted ||
      s.repeat !== prev.repeat ||
      s.autoplay !== prev.autoplay ||
      s.normalize !== prev.normalize
    ) {
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({
            volume: s.volume,
            muted: s.muted,
            repeat: s.repeat,
            autoplay: s.autoplay,
            normalize: s.normalize,
          }),
        );
      } catch {
        // приватний режим
      }
    }
  });
}
