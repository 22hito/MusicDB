"use client";
/** Налаштування → «Оформлення профілю» (Premium): аватар, банер, фон профілю й фон сайту. */
import type { CosmeticMedia, CosmeticPreset, CosmeticSlot } from "@musicdb/contracts/client";
import { endpoints } from "@musicdb/contracts/client";
import { ApiError } from "@musicdb/sdk";
import { invalidate, useApi, useMe } from "@musicdb/sdk/react";
import { FEATURES } from "@musicdb/tokens";
import { useQueryClient } from "@tanstack/react-query";
import { Loader2, Lock, Sparkles, Trash2, Upload } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { CosmeticView, setBgMotion, useBgMotion } from "@/components/cosmetics";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/heading";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { uploadFile } from "@/lib/upload";

const PRESETS: CosmeticPreset[] = ["aurora", "nebula", "sunset", "ocean", "ember"];
const SLOTS: { slot: CosmeticSlot; preview: string }[] = [
  { slot: "avatar", preview: "size-16 rounded-full" },
  { slot: "banner", preview: "h-16 w-64 rounded-md" },
  { slot: "background", preview: "h-16 w-28 rounded-md" },
  { slot: "siteBackground", preview: "h-16 w-28 rounded-md" },
];
const ACCEPT = "image/gif,image/png,image/jpeg,image/webp,video/mp4,video/webm,video/quicktime";

export function CosmeticsSection() {
  const { t } = useI18n();
  const api = useApi();
  const qc = useQueryClient();
  const me = useMe().data;
  const bgMotion = useBgMotion();
  const [busy, setBusy] = useState<CosmeticSlot | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const pending = useRef<CosmeticSlot>("avatar");
  const processing = me ? Object.values(me.cosmetics).some((m) => m?.status === "processing") : false;

  // Поки сервер обробляє файл — перевіряємо стан кожні 2,5 с.
  useEffect(() => {
    if (!processing) return;
    const timer = setInterval(() => void invalidate(qc, endpoints.me.get), 2500);
    return () => clearInterval(timer);
  }, [processing, qc]);

  if (!me) return null;
  const premium = me.premium.active;
  if (!premium && !FEATURES.premium && me.role !== "admin") return null;

  const apply = async (
    slot: CosmeticSlot,
    body: { uploadId?: string | null; preset?: CosmeticPreset | null },
  ) => {
    setBusy(slot);
    try {
      await api.me.setCosmetic({ body: { slot, ...body } });
      await invalidate(qc, endpoints.me.get, endpoints.users.get);
      if (!body.uploadId) toast(t("cosmetics.saved"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("errors.generic"));
    } finally {
      setBusy(null);
    }
  };

  const onFile = async (file: File) => {
    const slot = pending.current;
    setBusy(slot);
    try {
      const { uploadId } = await uploadFile(file, "cosmetic");
      await apply(slot, { uploadId });
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("errors.generic"));
      setBusy(null);
    }
  };

  return (
    <section className="space-y-4 border-b border-line pb-8">
      <h2 className="serif-title flex items-center gap-2 text-xl">
        <Sparkles className="size-5 text-accent" /> {t("cosmetics.title")}
      </h2>
      {!premium ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-surface-2/70 p-4">
          <span className="flex items-center gap-2 text-sm text-muted">
            <Lock className="size-4" /> {t("cosmetics.premiumOnly")}
          </span>
          <Button asChild size="sm" variant="primary">
            <Link href="/premium">{t("cosmetics.getPremium")}</Link>
          </Button>
        </div>
      ) : null}
      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void onFile(f);
        }}
      />
      <div className={cn("space-y-5", !premium && "pointer-events-none opacity-50")} aria-disabled={!premium}>
        {SLOTS.map(({ slot, preview }) => {
          const media = me.cosmetics[slot] as CosmeticMedia | null;
          const working = busy === slot || media?.status === "processing";
          return (
            <div key={slot} className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className={cn("relative shrink-0 overflow-hidden bg-surface-3", preview)}>
                {media && (media.preset || media.poster) ? <CosmeticView media={media} /> : null}
                {working ? (
                  <div className="absolute inset-0 grid place-items-center bg-black/40">
                    <Loader2 className="size-5 animate-spin text-white" />
                  </div>
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[15px] font-medium">{t(`cosmetics.${slot}`)}</div>
                <div className="text-sm text-muted">
                  {media?.status === "failed"
                    ? t("cosmetics.failed")
                    : working
                      ? t("cosmetics.processing")
                      : t(`cosmetics.${slot}Hint`)}
                </div>
                {slot !== "avatar" ? (
                  <div
                    className="mt-2 flex flex-wrap gap-1.5"
                    role="group"
                    aria-label={t("cosmetics.presets")}
                  >
                    {PRESETS.map((p) => (
                      <button
                        key={p}
                        type="button"
                        title={t(`cosmetics.presetNames.${p}`)}
                        aria-label={t(`cosmetics.presetNames.${p}`)}
                        aria-pressed={media?.preset === p}
                        disabled={working}
                        onClick={() => apply(slot, { preset: p })}
                        className={cn(
                          "relative h-7 w-10 overflow-hidden rounded-md ring-offset-2 ring-offset-bg transition",
                          media?.preset === p ? "ring-2 ring-accent" : "hover:ring-2 hover:ring-line-strong",
                        )}
                      >
                        <span className={cn("cosmetic-preset", `cosmetic-${p}`)} data-paused="true" />
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <div className="flex shrink-0 gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={working}
                  onClick={() => {
                    pending.current = slot;
                    fileRef.current?.click();
                  }}
                >
                  <Upload className="size-4" /> {t("cosmetics.upload")}
                </Button>
                {media ? (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={working}
                    aria-label={t("cosmetics.remove")}
                    onClick={() => apply(slot, { preset: null, uploadId: null })}
                  >
                    <Trash2 className="size-4" />
                  </Button>
                ) : null}
              </div>
            </div>
          );
        })}
        <p className="text-xs text-muted">{t("cosmetics.formats")}</p>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-[15px] font-medium">{t("cosmetics.motion")}</div>
            <div className="text-sm text-muted">{t("cosmetics.motionHint")}</div>
          </div>
          <Segmented
            value={bgMotion}
            onChange={setBgMotion}
            options={[
              { value: "auto", label: t("cosmetics.motionAuto") },
              { value: "static", label: t("cosmetics.motionStatic") },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
