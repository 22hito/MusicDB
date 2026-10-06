"use client";
import { useEffect, useRef } from "react";
import { playerStore } from "./store";
import { isVideoFullscreen } from "./video-slot";

type Extra = Partial<Record<"l" | "f" | "escape", () => void>>;

/**
 * Клавіші плеєра для повноекранних режимів: пробіл — пауза, ← → — перемотка на 5 с, ↑ ↓ — гучність,
 * M — звук, а L / F / Esc — те, що передасть екран (текст, на весь екран, закрити).
 * Ігноруються, коли фокус у полі вводу. `scope: "video"` — для оверлею відео на весь екран.
 */
export function usePlayerHotkeys(enabled: boolean, extra: Extra = {}, scope: "page" | "video" = "page") {
  const extraRef = useRef(extra);
  extraRef.current = extra;
  useEffect(() => {
    if (!enabled) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      // Поки відео на весь екран, клавіші обробляє лише його оверлей (інакше пробіл спрацює двічі).
      if ((scope === "video") !== isVideoFullscreen()) return;
      const el = e.target as HTMLElement | null;
      if (el?.closest("input, textarea, select, [contenteditable=true]")) return;
      const st = playerStore.getState();
      // Розкладка не важлива: дивимося на фізичну клавішу.
      switch (e.code) {
        case "Space":
          if (el?.closest("button, a, [role=slider]")) return;
          e.preventDefault();
          st.togglePlay();
          return;
        case "ArrowRight":
          if (el?.closest("[role=slider]")) return;
          e.preventDefault();
          st.seek(Math.min(st.durationMs, st.positionMs + 5000));
          return;
        case "ArrowLeft":
          if (el?.closest("[role=slider]")) return;
          e.preventDefault();
          st.seek(Math.max(0, st.positionMs - 5000));
          return;
        case "ArrowUp":
          e.preventDefault();
          st.setVolume(Math.min(1, st.volume + 0.05));
          return;
        case "ArrowDown":
          e.preventDefault();
          st.setVolume(Math.max(0, st.volume - 0.05));
          return;
        case "KeyM":
          st.toggleMute();
          return;
        case "KeyL":
          extraRef.current.l?.();
          return;
        case "KeyF":
          extraRef.current.f?.();
          return;
        case "Escape":
          extraRef.current.escape?.();
          return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [enabled, scope]);
}
