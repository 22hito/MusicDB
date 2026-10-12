/** Плеєр ↔ застосунок: стан у трей і на панель завдань, команди з трею й кнопок панелі — у плеєр. */
import { useEffect } from "react";
import { playerStore, usePlayer } from "@/player/store";

type Bridge = {
  sendPlayerState(s: {
    playing: boolean;
    title: string | null;
    artist: string | null;
    hasTrack: boolean;
  }): void;
  onCommand(cb: (cmd: "toggle" | "next" | "prev") => void): () => void;
  setTitleBar(colors: { color: string; symbolColor: string }): void;
};

export const desktop = (globalThis as { nowlDesktop?: Bridge }).nowlDesktop;

export function DesktopBridge() {
  const track = usePlayer((s) => s.current?.track ?? null);
  const playing = usePlayer((s) => s.status === "playing" || s.status === "loading");

  useEffect(() => {
    desktop?.sendPlayerState({
      playing,
      title: track?.title ?? null,
      artist: track ? track.artists.map((a) => a.name).join(", ") : null,
      hasTrack: !!track,
    });
  }, [track, playing]);

  useEffect(
    () =>
      desktop?.onCommand((cmd) => {
        const p = playerStore.getState();
        if (cmd === "toggle") p.togglePlay();
        else if (cmd === "next") p.next();
        else p.previous();
      }),
    [],
  );

  return null;
}
