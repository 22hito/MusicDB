"use client";
/** Модальне вікно «Зберегти як плейлист»: назва, видимість, кількість пісень — і перехід до плейлиста. */
import type { Track } from "@musicdb/contracts/client";
import { usePlaylistActions } from "@musicdb/sdk/react";
import { Globe, Lock } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n";

export function SavePlaylistDialog({
  open,
  onOpenChange,
  defaultTitle,
  loadTracks,
  description,
  successMessage,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTitle: string;
  /** Пісні для плейлиста (можуть підвантажуватися лише при збереженні). */
  loadTracks: () => Promise<Track[]> | Track[];
  description?: string;
  successMessage?: string;
}) {
  const t = useT();
  const router = useRouter();
  const actions = usePlaylistActions();
  const [title, setTitle] = useState(defaultTitle);
  const [visibility, setVisibility] = useState<"private" | "public">("private");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (open) setTitle(defaultTitle);
  }, [open, defaultTitle]);

  const save = async () => {
    setBusy(true);
    try {
      const tracks = await loadTracks();
      const playlist = await actions.create.mutateAsync({
        title: title.trim() || defaultTitle,
        visibility,
        trackIds: tracks.slice(0, 500).map((x) => x.id),
      });
      onOpenChange(false);
      toast(successMessage ?? t("playlist.created"), {
        action: { label: t("common.open"), onClick: () => router.push(`/playlist/${playlist.id}`) },
      });
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("playlist.saveTitle")}
      {...(description ? { description } : {})}
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void save();
        }}
        className="space-y-4"
      >
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-muted">{t("playlist.titleLabel")}</span>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={100}
            autoFocus
            className="h-11 w-full rounded-lg border border-line bg-surface-3 px-3 outline-none focus:border-accent"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              ["private", Lock, t("playlist.private")],
              ["public", Globe, t("playlist.public")],
            ] as const
          ).map(([value, Icon, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setVisibility(value)}
              className={cn(
                "flex items-center gap-2 rounded-lg border px-3 py-2.5 text-left text-sm transition-colors",
                visibility === value
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line hover:border-line-strong",
              )}
            >
              <Icon className="size-4 shrink-0" /> {label}
            </button>
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="submit" loading={busy}>
            {t("common.save")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
