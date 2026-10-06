"use client";
import { endpoints } from "@musicdb/contracts/client";
import type { Locale } from "@musicdb/i18n";
import { formatRelative } from "@musicdb/i18n";
import { ApiError } from "@musicdb/sdk";
import { invalidate, useApi, useEndpoint, useMe } from "@musicdb/sdk/react";
import { accentNames, palette } from "@musicdb/tokens";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Check, Laptop, LogOut, Smartphone } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import { Avatar } from "@/components/ui/cover";
import { Dialog } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/heading";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { type ThemeSetting, useSettings } from "@/lib/settings";
import { uploadFile } from "@/lib/upload";
import { playerStore, usePlayer } from "@/player/store";

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-4 border-b border-line pb-8 last:border-0">
      <h2 className="serif-title text-xl">{title}</h2>
      {children}
    </section>
  );
}

function Row({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6">
      <div>
        <div className="text-[15px] font-medium">{label}</div>
        {hint ? <div className="text-sm text-muted">{hint}</div> : null}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        "relative h-6 w-11 rounded-full transition-colors",
        checked ? "bg-accent" : "bg-surface-3",
      )}
    >
      <span
        className={cn(
          "absolute top-0.5 left-0.5 size-5 rounded-full bg-white shadow transition-transform",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}

export function SettingsView() {
  const { t, locale } = useI18n();
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const me = useMe().data;
  const settings = useSettings();
  const autoplay = usePlayer((s) => s.autoplay);
  const normalize = usePlayer((s) => s.normalize);
  const sessions = useEndpoint(endpoints.me.sessions, undefined, { enabled: !!me });
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [bio, setBio] = useState("");
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!me) return;
    setName(me.name);
    setUsername(me.username ?? "");
    setBio(me.bio ?? "");
  }, [me]);

  if (!me) return null;

  const saveProfile = async () => {
    setSaving(true);
    try {
      await api.me.update({ body: { name, ...(username ? { username } : {}), bio: bio || null } });
      await invalidate(qc, endpoints.me.get);
      toast(t("common.saved"));
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("errors.generic"));
    } finally {
      setSaving(false);
    }
  };

  const changeAvatar = async (file: File) => {
    setUploading(true);
    try {
      const { uploadId } = await uploadFile(file, "avatar");
      await api.me.update({ body: { avatarUploadId: uploadId } });
      await invalidate(qc, endpoints.me.get);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("errors.generic"));
    } finally {
      setUploading(false);
    }
  };

  const setLocale = async (l: Locale) => {
    settings.setLocale(l);
    await api.me.update({ body: { locale: l } }).catch(() => {});
    router.refresh();
  };

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 pt-4 pb-10 sm:px-6">
      <h1 className="serif-title text-3xl">{t("settings.title")}</h1>

      <Section title={t("nav.profile")}>
        <div className="flex items-center gap-5">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="group relative rounded-full"
            aria-label={t("settings.avatar")}
          >
            <Avatar src={me.image} name={me.name} size={96} />
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
              <Camera className="size-6 text-white" />
            </span>
            {uploading ? <span className="absolute inset-0 animate-pulse rounded-full bg-black/40" /> : null}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            hidden
            onChange={(e) => e.target.files?.[0] && changeAvatar(e.target.files[0])}
          />
          <div className="text-sm text-muted">{me.email}</div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-muted">{t("auth.name")}</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={60}
              className="h-11 w-full rounded-md bg-surface-2 px-3 outline-none focus:ring-2 focus:ring-accent"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-bold text-muted">{t("settings.username")}</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_.]/g, ""))}
              maxLength={30}
              placeholder="nowl.fan"
              className="h-11 w-full rounded-md bg-surface-2 px-3 outline-none focus:ring-2 focus:ring-accent"
            />
          </label>
        </div>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-muted">{t("settings.bio")}</span>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={300}
            rows={3}
            className="w-full resize-none rounded-md bg-surface-2 p-3 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
        <Button onClick={saveProfile} loading={saving}>
          {t("common.save")}
        </Button>
      </Section>

      <Section title={t("settings.appearance")}>
        <Row label={t("settings.theme")}>
          <div className="flex rounded-full bg-surface-2 p-1">
            {(["dark", "gray", "light", "system"] as ThemeSetting[]).map((th) => (
              <button
                key={th}
                type="button"
                onClick={() => settings.setTheme(th)}
                className={cn(
                  "h-8 rounded-full px-3 text-sm font-semibold transition-colors",
                  settings.theme === th ? "bg-accent text-on-accent" : "text-muted hover:text-fg",
                )}
              >
                {t(`settings.theme${th[0]!.toUpperCase()}${th.slice(1)}` as "settings.themeDark")}
              </button>
            ))}
          </div>
        </Row>
        <Row label={t("settings.accent")}>
          <div className="flex gap-2">
            {accentNames.map((a) => (
              <button
                key={a}
                type="button"
                aria-label={t(`settings.accents.${a}`)}
                title={t(`settings.accents.${a}`)}
                onClick={() => settings.setAccent(a)}
                className="flex size-8 items-center justify-center rounded-full transition-transform hover:scale-110"
                style={{
                  background: palette("dark", a).accent,
                  boxShadow:
                    settings.accent === a
                      ? `0 0 0 2px var(--n-bg), 0 0 0 4px ${palette("dark", a).accent}`
                      : undefined,
                }}
              >
                {settings.accent === a ? <Check className="size-4 text-black/80" /> : null}
              </button>
            ))}
          </div>
        </Row>
        <Row label={t("settings.motion")} hint={t("settings.motionHint")}>
          <Segmented
            value={settings.motion}
            onChange={settings.setMotion}
            options={(["full", "reduced", "system"] as const).map((m) => ({
              value: m,
              label: t(`settings.motion${m[0]!.toUpperCase()}${m.slice(1)}` as "settings.motionFull"),
            }))}
          />
        </Row>
        <Row label={t("settings.language")}>
          <div className="flex rounded-full bg-surface-2 p-1">
            {(["uk", "en"] as Locale[]).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLocale(l)}
                className={cn(
                  "h-8 rounded-full px-4 text-sm font-semibold",
                  locale === l ? "bg-accent text-on-accent" : "text-muted hover:text-fg",
                )}
              >
                {l === "uk" ? "Українська" : "English"}
              </button>
            ))}
          </div>
        </Row>
      </Section>

      <Section title={t("settings.playback")}>
        <Row label={t("settings.autoplay")}>
          <Toggle
            checked={autoplay}
            onChange={(v) => playerStore.getState().setAutoplay(v)}
            label={t("settings.autoplay")}
          />
        </Row>
        <Row label={t("settings.normalize")} hint="EBU R128 · −14 LUFS">
          <Toggle
            checked={normalize}
            onChange={(v) => playerStore.getState().setNormalize(v)}
            label={t("settings.normalize")}
          />
        </Row>
      </Section>

      <Section title={t("settings.privacy")}>
        <Row label={t("settings.privateProfile")} hint={t("profile.privateProfile")}>
          <Toggle
            checked={me.isPrivate}
            onChange={async (v) => {
              await api.me.update({ body: { isPrivate: v } });
              await invalidate(qc, endpoints.me.get);
            }}
            label={t("settings.privateProfile")}
          />
        </Row>
      </Section>

      <Section title={t("settings.devices")}>
        <ul className="space-y-2">
          {sessions.data?.items.map((s) => {
            const mobile = /android|iphone|ipad|expo/i.test(s.userAgent ?? "");
            return (
              <li key={s.id} className="flex items-center gap-4 rounded-lg bg-surface-2 p-4">
                {mobile ? (
                  <Smartphone className="size-6 text-muted" />
                ) : (
                  <Laptop className="size-6 text-muted" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-semibold">{describeAgent(s.userAgent)}</div>
                  <div className="text-xs text-muted">
                    {s.current ? (
                      <span className="font-bold text-accent">{t("settings.currentDevice")} · </span>
                    ) : null}
                    {formatRelative(s.lastActiveAt, t, locale)}
                  </div>
                </div>
                {!s.current ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={async () => {
                      await api.me.revokeSession({ params: { id: s.id } });
                      await sessions.refetch();
                    }}
                  >
                    <LogOut className="size-4" /> {t("settings.signOutDevice")}
                  </Button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </Section>

      <Section title={t("settings.account")}>
        <div className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={async () => {
              if (!(await confirm({ title: t("confirm.signOut"), confirmLabel: t("common.signOut") })))
                return;
              await authClient.signOut();
              qc.clear();
              router.push("/");
              router.refresh();
            }}
          >
            {t("common.signOut")}
          </Button>
          <Button variant="danger" onClick={() => setDeleting(true)}>
            {t("settings.deleteAccount")}
          </Button>
        </div>
      </Section>

      <DeleteAccountDialog open={deleting} onOpenChange={setDeleting} />
    </div>
  );
}

function describeAgent(ua: string | null) {
  if (!ua) return "—";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /Chrome\//.test(ua)
      ? "Chrome"
      : /Firefox\//.test(ua)
        ? "Firefox"
        : /Safari\//.test(ua)
          ? "Safari"
          : /Expo|okhttp/i.test(ua)
            ? "N'Owl App"
            : "Browser";
  const os = /Windows/.test(ua)
    ? "Windows"
    : /Android/.test(ua)
      ? "Android"
      : /iPhone|iPad/.test(ua)
        ? "iOS"
        : /Mac OS/.test(ua)
          ? "macOS"
          : /Linux/.test(ua)
            ? "Linux"
            : "";
  return os ? `${browser} · ${os}` : browser;
}

function DeleteAccountDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useI18n();
  const api = useApi();
  const qc = useQueryClient();
  const router = useRouter();
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("settings.deleteAccount")}
      description={t("settings.deleteAccountText")}
    >
      <input
        value={confirm}
        onChange={(e) => setConfirm(e.target.value)}
        placeholder="DELETE"
        className="h-11 w-full rounded-md bg-surface-3 px-3 font-mono outline-none focus:ring-2 focus:ring-danger"
      />
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={() => onOpenChange(false)}>
          {t("common.cancel")}
        </Button>
        <Button
          variant="danger"
          disabled={confirm !== "DELETE"}
          loading={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await api.me.delete({ body: { confirm: "DELETE" } });
              qc.clear();
              router.push("/");
              router.refresh();
            } finally {
              setBusy(false);
            }
          }}
        >
          {t("common.delete")}
        </Button>
      </div>
    </Dialog>
  );
}
