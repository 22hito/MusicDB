"use client";
/**
 * Елементи керування поверх відео на весь екран. Живуть усередині контейнера з iframe (його й розгортає
 * Fullscreen API), тож видимі лише тоді, коли контейнер на весь екран. Прозорий шар над iframe ловить рух
 * миші (з iframe події не доходять) — через 2,5 с бездіяльності панелі й курсор ховаються.
 * Клік по відео — пауза/відтворення, подвійний клік або Esc — вихід.
 */
import { Minimize2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { ArtistLinks } from "@/components/music/common";
import { Controls, Progress, Volume } from "@/components/shell/player-bar";
import { IconButton } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n";
import { usePlayerHotkeys } from "./hotkeys";
import { playerStore, usePlayer } from "./store";

export function VideoFullscreenOverlay({
  hostRef,
  visible,
}: {
  hostRef: React.RefObject<HTMLDivElement | null>;
  visible: boolean;
}) {
  const t = useT();
  const [active, setActive] = useState(false);
  const [idle, setIdle] = useState(false);
  const timer = useRef(0);
  const track = usePlayer((s) => s.current?.track);

  useEffect(() => {
    const on = () => setActive(!!hostRef.current && document.fullscreenElement === hostRef.current);
    document.addEventListener("fullscreenchange", on);
    return () => document.removeEventListener("fullscreenchange", on);
  }, [hostRef]);

  // Наступна пісня без відео — виходимо, щоб не лишити чорний екран.
  useEffect(() => {
    if (active && !visible) void document.exitFullscreen().catch(() => {});
  }, [active, visible]);

  const poke = useCallback(() => {
    setIdle(false);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setIdle(true), 2500);
  }, []);

  useEffect(() => {
    if (active) poke();
    else {
      window.clearTimeout(timer.current);
      setIdle(false);
    }
    return () => window.clearTimeout(timer.current);
  }, [active, poke]);

  const exit = () => void document.exitFullscreen().catch(() => {});
  usePlayerHotkeys(active, { f: exit }, "video");

  if (!active || !track) return null;
  return (
    // biome-ignore lint/a11y/noStaticElementInteractions: клік по відео — як у будь-якому відеоплеєрі; клавіші — через usePlayerHotkeys
    // biome-ignore lint/a11y/useKeyWithClickEvents: те саме — пробіл обробляє usePlayerHotkeys
    <div
      className={cn("absolute inset-0 z-10 flex flex-col justify-between text-white", idle && "cursor-none")}
      onPointerMove={poke}
      onClick={() => {
        poke();
        playerStore.getState().togglePlay();
      }}
      onDoubleClick={exit}
    >
      <div
        className={cn(
          "bg-gradient-to-b from-black/70 to-transparent px-8 pt-6 pb-16 transition-opacity duration-300",
          idle && "pointer-events-none opacity-0",
        )}
      >
        <div className="flex items-start gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] font-bold tracking-[0.18em] text-white/60 uppercase">
              {t("player.nowPlaying")}
            </div>
            <div className="mt-1 truncate font-serif text-2xl font-semibold">{track.title}</div>
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              exit();
            }}
            onDoubleClick={(e) => e.stopPropagation()}
            title="Esc"
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-full border border-white/25 bg-black/40 px-4 text-[13px] font-semibold backdrop-blur transition-colors hover:bg-black/60"
          >
            <Minimize2 className="size-4" />
            {t("player.exit")}
          </button>
        </div>
      </div>
      {/* biome-ignore lint/a11y/noStaticElementInteractions: лише зупиняє спливання кліку до шару відео */}
      {/* biome-ignore lint/a11y/useKeyWithClickEvents: те саме */}
      <div
        className={cn(
          "bg-gradient-to-t from-black/85 via-black/50 to-transparent px-8 pt-20 pb-6 transition-opacity duration-300",
          idle && "pointer-events-none opacity-0",
        )}
        onClick={(e) => e.stopPropagation()}
        onDoubleClick={(e) => e.stopPropagation()}
      >
        <Progress className="text-white/80" />
        <div className="mt-3 grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-4">
          <ArtistLinks artists={track.artists} className="truncate text-sm text-white/75" />
          <Controls large />
          <div className="flex items-center justify-end gap-2">
            <Volume className="w-[160px]" />
            <IconButton label={t("player.exitFullscreen")} onClick={exit} className="text-white">
              <Minimize2 className="size-5" />
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  );
}
