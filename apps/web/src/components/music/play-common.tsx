"use client";
import type { Translate } from "@musicdb/i18n";
import { Headphones } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useT } from "@/lib/i18n";
import { playerStore } from "@/player/store";

/** Рівень сумісності смаків (як на Last.fm): за відсотком збігу. */
export function tasteTier(match: number, t: Translate) {
  if (match >= 75) return { label: t("taste.tierSuper"), tone: "text-accent" };
  if (match >= 50) return { label: t("taste.tierHigh"), tone: "text-success" };
  if (match >= 25) return { label: t("taste.tierMedium"), tone: "text-fg-2" };
  return { label: t("taste.tierLow"), tone: "text-muted" };
}

/** «Слухати спільне»: пісні, які подобаються або слухаються і вам, і цій людині. */
export function PlayCommonButton({
  userId,
  name,
  size = "sm",
  iconOnly,
}: {
  userId: string;
  name: string;
  size?: "sm" | "md";
  iconOnly?: boolean;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const play = async () => {
    setBusy(true);
    try {
      const res = await api.users.common({ params: { id: userId } });
      if (!res.items.length) {
        toast(t("taste.commonEmpty"));
        return;
      }
      playerStore
        .getState()
        .playContext(
          res.items,
          0,
          { type: "profile", id: userId, name: `${t("taste.playCommon")} · ${name}` },
          { shuffle: true },
        );
    } finally {
      setBusy(false);
    }
  };
  return (
    <Button
      variant="outline"
      size={size}
      loading={busy}
      onClick={play}
      title={t("taste.playCommon")}
      aria-label={t("taste.playCommon")}
      className={iconOnly ? "px-2.5" : undefined}
    >
      {busy ? null : <Headphones className="size-4" />}
      {iconOnly ? null : t("taste.playCommon")}
    </Button>
  );
}
