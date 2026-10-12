/**
 * Смуга заголовка вікна (32 px): за неї тягнуть вікно, праворуч — кнопки Windows (згорнути, розгорнути,
 * закрити), зліва — назва й те, що грає. Інтерфейс починається під нею, тож кнопки нічого не перекривають.
 */
import { useEffect } from "react";
import { OwlGlyph } from "@/components/shell/logo";
import { useSettings } from "@/lib/settings";
import { usePlayer } from "@/player/store";
import { desktop } from "./bridge";

export function TitleBar() {
  const theme = useSettings((s) => s.theme);
  const track = usePlayer((s) => s.current?.track ?? null);
  useEffect(() => {
    const light =
      theme === "light" || (theme === "system" && window.matchMedia("(prefers-color-scheme: light)").matches);
    desktop?.setTitleBar({ color: "#00000000", symbolColor: light ? "#3a3d4a" : "#c9cbd6" });
  }, [theme]);
  return (
    <div
      className="desktop-drag fixed inset-x-0 top-0 z-[80] flex h-[var(--desktop-titlebar)] items-center gap-2 border-b border-line/50 bg-bg pl-3 text-xs text-muted select-none"
      style={{ paddingRight: "calc(100vw - env(titlebar-area-width, calc(100vw - 140px)))" }}
    >
      <OwlGlyph className="size-4" />
      <span className="font-semibold text-fg-2">N&apos;Owl</span>
      {track ? (
        <span className="truncate">
          · {track.title} — {track.artists.map((a) => a.name).join(", ")}
        </span>
      ) : null}
    </div>
  );
}
