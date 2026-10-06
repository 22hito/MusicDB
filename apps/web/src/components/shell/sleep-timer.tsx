"use client";
/** Таймер сну (як в Apple Music / YouTube Music): пауза через N хвилин або наприкінці пісні. */
import { Moon } from "lucide-react";
import { useEffect, useState } from "react";
import { IconButton } from "@/components/ui/button";
import { DropdownMenu } from "@/components/ui/menu";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n";
import { playerStore, usePlayer } from "@/player/store";

const OPTIONS = [5, 15, 30, 45, 60, 90];

/** Залишок часу «хх:сс» або «год:хх:сс», оновлюється щосекунди, поки таймер активний. */
export function useSleepLeft() {
  const sleep = usePlayer((s) => s.sleep);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (sleep?.mode !== "time") return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [sleep]);
  if (sleep?.mode !== "time") return null;
  const left = Math.max(0, Math.round((sleep.endsAt - now) / 1000));
  const h = Math.floor(left / 3600);
  const m = Math.floor((left % 3600) / 60);
  const s = left % 60;
  return h
    ? `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    : `${m}:${String(s).padStart(2, "0")}`;
}

export function SleepTimerButton({ className }: { className?: string }) {
  const t = useT();
  const sleep = usePlayer((s) => s.sleep);
  const hasTrack = usePlayer((s) => !!s.current);
  const left = useSleepLeft();
  const set = (v: number | "track" | null) => playerStore.getState().setSleepTimer(v);
  const label = sleep
    ? sleep.mode === "track"
      ? t("player.sleepTrackLeft")
      : t("player.sleepLeft", { time: left ?? "" })
    : t("player.sleep");
  return (
    <span className={cn("relative inline-flex items-center", className)}>
      <DropdownMenu
        side="top"
        items={[
          ...OPTIONS.map((m) => ({
            label: t("player.sleepMinutes", { count: m }),
            onSelect: () => set(m),
          })),
          {
            label: t("player.sleepTrack"),
            checked: sleep?.mode === "track",
            onSelect: () => set("track"),
          },
          ...(sleep
            ? [
                { type: "separator" as const },
                { label: t("player.sleepOff"), danger: true, onSelect: () => set(null) },
              ]
            : []),
        ]}
        trigger={
          <IconButton label={label} size="sm" active={!!sleep} disabled={!hasTrack && !sleep}>
            <Moon className="size-[18px]" fill={sleep ? "currentColor" : "none"} />
          </IconButton>
        }
      />
      {left ? (
        <span className="pointer-events-none absolute -bottom-2 left-1/2 -translate-x-1/2 animate-pop rounded-full bg-accent px-1 text-[9px] leading-tight font-bold text-on-accent tabular-nums">
          {left}
        </span>
      ) : null}
    </span>
  );
}
