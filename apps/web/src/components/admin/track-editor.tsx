"use client";
/**
 * Редагування пісні адміном: усі поля каталогу (назва, виконавці, реліз, дата, тривалість, жанри, explicit,
 * YouTube, текст і LRC, статус, джерело). Відкривається з адмінки та з меню будь-якої пісні —
 * `openTrackEditor(id)`; вікно одне на застосунок (`TrackEditorHost` у провайдерах).
 * Надсилаються лише змінені поля.
 */
import { type AdminTrackDetail, type CatalogCheck, endpoints } from "@musicdb/contracts/client";
import { invalidate, useApi } from "@musicdb/sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ExternalLink, ShieldQuestion, Trash2, X } from "lucide-react";
import Link from "next/link";
import { type KeyboardEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { create } from "zustand";
import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import { Dialog } from "@/components/ui/dialog";
import { Segmented } from "@/components/ui/heading";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";

type EditorState = { open: boolean; trackId: string | null; onSaved?: (() => void) | undefined };

const useEditor = create<EditorState>(() => ({ open: false, trackId: null }));

/** Відкрити редактор пісні (`null` — нова пісня). */
export function openTrackEditor(trackId: string | null, onSaved?: () => void) {
  useEditor.setState({ open: true, trackId, onSaved });
}

type Form = {
  title: string;
  artists: string[];
  releaseTitle: string;
  releaseDate: string;
  duration: string;
  explicit: boolean;
  youtube: string;
  genres: string[];
  lyrics: string;
  lyricsSynced: string;
  status: "published" | "hidden";
  source: "catalog" | "community";
};

const empty: Form = {
  title: "",
  artists: [],
  releaseTitle: "",
  releaseDate: "",
  duration: "",
  explicit: false,
  youtube: "",
  genres: [],
  lyrics: "",
  lyricsSynced: "",
  status: "published",
  source: "catalog",
};

const fmtDuration = (ms: number) =>
  ms > 0 ? `${Math.floor(ms / 60000)}:${String(Math.round((ms % 60000) / 1000)).padStart(2, "0")}` : "";

/** «3:25» / «205» → мс; порожньо → 0; помилка → null. */
function parseDuration(v: string): number | null {
  const s = v.trim();
  if (!s) return 0;
  const m = s.match(/^(\d{1,3}):([0-5]?\d)$/);
  if (m) return (Number(m[1]) * 60 + Number(m[2])) * 1000;
  if (/^\d{1,5}$/.test(s)) return Number(s) * 1000;
  return null;
}

/** id відео з посилання будь-якого виду або сам id. */
function youtubeId(v: string): string | null {
  const s = v.trim();
  if (!s) return null;
  if (/^[\w-]{11}$/.test(s)) return s;
  const m = s.match(/(?:v=|youtu\.be\/|shorts\/|embed\/|live\/)([\w-]{11})/);
  return m ? m[1]! : null;
}

function toForm(d: AdminTrackDetail): Form {
  return {
    title: d.title,
    artists: d.artists,
    releaseTitle: d.releaseTitle ?? "",
    releaseDate: d.releaseDate ?? "",
    duration: fmtDuration(d.durationMs),
    explicit: d.explicit,
    youtube: d.youtubeVideoId ?? "",
    genres: d.genres,
    lyrics: d.lyrics ?? "",
    lyricsSynced: d.lyricsSynced ?? "",
    status: d.status === "hidden" ? "hidden" : "published",
    source: d.source,
  };
}

const same = (a: string[], b: string[]) => a.length === b.length && a.every((x, i) => x === b[i]);

export function TrackEditorHost() {
  const { t } = useI18n();
  const api = useApi();
  const qc = useQueryClient();
  const { open, trackId, onSaved } = useEditor();
  const [initial, setInitial] = useState<AdminTrackDetail | null>(null);
  const [form, setForm] = useState<Form>(empty);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setInitial(null);
    setForm(empty);
    if (!trackId) return;
    setLoading(true);
    api.admin
      .track({ params: { id: trackId } })
      .then((d) => {
        setInitial(d);
        setForm(toForm(d));
      })
      .catch((err) => {
        toast.error(err instanceof Error ? err.message : t("errors.generic"));
        useEditor.setState({ open: false });
      })
      .finally(() => setLoading(false));
  }, [open, trackId, api, t]);

  const base = useMemo(() => (initial ? toForm(initial) : empty), [initial]);
  const durationMs = parseDuration(form.duration);
  const ytId = youtubeId(form.youtube);
  const ytInvalid = !!form.youtube.trim() && !ytId;
  const lrcLines = form.lyricsSynced
    .split("\n")
    .filter((l) => /^\[\d{1,2}:\d{2}(?:[.:]\d{1,3})?\]/.test(l)).length;

  /** Лише змінені поля — у форматі API. */
  const patch = useMemo(() => {
    const p: Record<string, unknown> = {};
    if (form.title.trim() !== base.title) p.title = form.title.trim();
    if (!same(form.artists, base.artists)) p.artists = form.artists;
    if (form.releaseTitle.trim() !== base.releaseTitle) p.releaseTitle = form.releaseTitle.trim();
    if (form.releaseDate !== base.releaseDate) p.releaseDate = form.releaseDate || null;
    if (form.duration.trim() !== base.duration && durationMs !== null) p.durationMs = durationMs;
    if (form.explicit !== base.explicit) p.explicit = form.explicit;
    if ((ytId ?? "") !== base.youtube && !ytInvalid) p.youtubeUrl = ytId ?? "";
    if (!same(form.genres, base.genres)) p.genres = form.genres;
    if (form.lyrics !== base.lyrics) p.lyrics = form.lyrics;
    if (form.lyricsSynced !== base.lyricsSynced) p.lyricsSynced = form.lyricsSynced.trim() || null;
    if (form.status !== base.status) p.status = form.status;
    if (form.source !== base.source) p.source = form.source;
    return p;
  }, [form, base, durationMs, ytId, ytInvalid]);
  const dirty = Object.keys(patch).length > 0;
  const valid = form.title.trim() && form.artists.length > 0 && durationMs !== null && !ytInvalid;

  const close = async () => {
    if (dirty && !busy && !(await confirm({ title: t("admin.unsaved"), confirmLabel: t("common.close") })))
      return;
    useEditor.setState({ open: false });
  };

  const save = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      if (trackId) {
        const d = await api.admin.updateTrack({ params: { id: trackId }, body: patch });
        setInitial(d);
        setForm(toForm(d));
        toast(t("admin.saved"));
      } else {
        const created = await api.admin.createTrack({
          body: {
            title: form.title.trim(),
            artists: form.artists,
            genres: form.genres,
            explicit: form.explicit,
            source: form.source,
            ...(form.releaseTitle.trim() ? { releaseTitle: form.releaseTitle.trim() } : {}),
            ...(form.releaseDate ? { releaseDate: form.releaseDate } : {}),
            ...(durationMs ? { durationMs } : {}),
            ...(ytId ? { youtubeUrl: ytId } : {}),
            ...(form.lyrics.trim() ? { lyrics: form.lyrics } : {}),
          },
        });
        toast(t("admin.created"));
        useEditor.setState({ trackId: created.id });
      }
      await invalidate(qc, endpoints.admin.tracks, endpoints.tracks.get, endpoints.tracks.lyrics);
      onSaved?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!trackId || !initial) return;
    const ok = await confirm({
      title: t("admin.deleteSong"),
      description: t("admin.deleteConfirm", { title: initial.title }),
      confirmLabel: t("admin.deleteSong"),
      danger: true,
    });
    if (!ok) return;
    try {
      await api.admin.deleteTrack({ params: { id: trackId } });
      toast(t("admin.deleted"));
      await invalidate(qc, endpoints.admin.tracks);
      onSaved?.();
      useEditor.setState({ open: false });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("errors.generic"));
    }
  };

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => (o ? null : void close())}
      title={trackId ? t("admin.editSong") : t("admin.newSong")}
      {...(initial ? { description: `${initial.artists.join(", ")} · ${initial.id}` } : {})}
      className="max-w-[760px]"
    >
      {loading ? (
        <div className="space-y-3">
          <div className="skeleton h-11 rounded-md" />
          <div className="skeleton h-11 rounded-md" />
          <div className="skeleton h-40 rounded-md" />
        </div>
      ) : (
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            void save();
          }}
        >
          {trackId ? <CheckPanel check={initial?.check ?? null} /> : null}
          <Field label={t("admin.f.title")}>
            <input
              value={form.title}
              onChange={(e) => set("title", e.target.value)}
              maxLength={300}
              className={inputCls}
            />
          </Field>
          <Field label={t("admin.f.artists")} hint={t("admin.f.artistsHint")}>
            <TagInput value={form.artists} onChange={(v) => set("artists", v)} max={10} />
          </Field>
          <div className="grid gap-4 sm:grid-cols-[1fr_170px_140px]">
            <Field label={t("admin.f.release")}>
              <input
                value={form.releaseTitle}
                onChange={(e) => set("releaseTitle", e.target.value)}
                maxLength={300}
                className={inputCls}
              />
            </Field>
            <Field label={t("admin.f.releaseDate")}>
              <input
                type="date"
                value={form.releaseDate}
                onChange={(e) => set("releaseDate", e.target.value)}
                className={inputCls}
              />
            </Field>
            <Field label={t("admin.f.duration")}>
              <input
                value={form.duration}
                onChange={(e) => set("duration", e.target.value)}
                placeholder="3:25"
                inputMode="numeric"
                className={cn(inputCls, durationMs === null && "ring-2 ring-danger")}
              />
            </Field>
          </div>
          <Field label={t("admin.f.genres")}>
            <TagInput value={form.genres} onChange={(v) => set("genres", v)} max={5} lower />
          </Field>
          <div className="grid items-start gap-4 sm:grid-cols-[1fr_auto]">
            <Field label={t("admin.f.youtube")}>
              <input
                value={form.youtube}
                onChange={(e) => set("youtube", e.target.value)}
                placeholder="https://youtu.be/…"
                className={cn(inputCls, ytInvalid && "ring-2 ring-danger")}
              />
            </Field>
            {ytId ? (
              <a
                href={`https://www.youtube.com/watch?v=${ytId}`}
                target="_blank"
                rel="noreferrer"
                className="group relative mt-6 block w-36 overflow-hidden rounded-md"
                title="YouTube"
              >
                <img
                  src={`https://i.ytimg.com/vi/${ytId}/mqdefault.jpg`}
                  alt=""
                  className="aspect-video w-full object-cover"
                />
                <ExternalLink className="absolute top-1.5 right-1.5 size-4 text-white opacity-0 drop-shadow transition-opacity group-hover:opacity-100" />
              </a>
            ) : null}
          </div>
          <label className="flex items-center gap-2.5 text-sm font-medium">
            <input
              type="checkbox"
              checked={form.explicit}
              onChange={(e) => set("explicit", e.target.checked)}
              className="size-4 accent-[var(--n-accent)]"
            />
            {t("admin.f.explicit")}
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t("admin.f.lyrics")}>
              <textarea
                value={form.lyrics}
                onChange={(e) => set("lyrics", e.target.value)}
                rows={8}
                maxLength={20_000}
                className={textCls}
              />
            </Field>
            <Field
              label={t("admin.f.lyricsSynced")}
              hint={form.lyricsSynced.trim() ? t("admin.f.lrcLines", { count: lrcLines }) : "[00:12.30] …"}
            >
              <textarea
                value={form.lyricsSynced}
                onChange={(e) => set("lyricsSynced", e.target.value)}
                rows={8}
                maxLength={40_000}
                spellCheck={false}
                className={cn(textCls, "font-mono text-[12.5px]")}
              />
            </Field>
          </div>
          <div className="flex flex-wrap gap-6">
            <Field label={t("admin.f.status")}>
              <Segmented
                value={form.status}
                onChange={(v) => set("status", v)}
                options={[
                  { value: "published", label: t("admin.f.published") },
                  { value: "hidden", label: t("admin.f.hidden") },
                ]}
              />
            </Field>
            <Field label={t("admin.f.source")}>
              <Segmented
                value={form.source}
                onChange={(v) => set("source", v)}
                options={[
                  { value: "catalog", label: t("admin.filter.catalog") },
                  { value: "community", label: t("admin.filter.community") },
                ]}
              />
            </Field>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-line pt-4">
            {trackId ? (
              <>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={remove}
                  className="text-danger hover:text-danger"
                >
                  <Trash2 className="size-4" /> {t("admin.deleteSong")}
                </Button>
                <Link
                  href={`/track/${trackId}`}
                  onClick={() => useEditor.setState({ open: false })}
                  className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-muted hover:text-fg"
                >
                  <ExternalLink className="size-4" /> {t("admin.openPage")}
                </Link>
              </>
            ) : null}
            <div className="ml-auto flex gap-2">
              <Button type="button" variant="outline" onClick={() => void close()}>
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={!valid || busy || (!!trackId && !dirty)}>
                {t("common.save")}
              </Button>
            </div>
          </div>
        </form>
      )}
    </Dialog>
  );
}

const inputCls =
  "h-11 w-full rounded-md bg-surface-3 px-3 text-sm outline-none focus:ring-2 focus:ring-accent [color-scheme:dark]";
const textCls =
  "w-full resize-y rounded-md bg-surface-3 p-3 text-sm outline-none focus:ring-2 focus:ring-accent";

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="block min-w-0">
      <span className="mb-1.5 block text-xs font-bold text-muted">{label}</span>
      {children}
      {hint ? <span className="mt-1 block text-[11.5px] text-subtle">{hint}</span> : null}
    </div>
  );
}

/** Список значень чипами: Enter або кома — додати, Backspace у порожньому полі — прибрати останнє. */
function TagInput({
  value,
  onChange,
  max,
  lower,
}: {
  value: string[];
  onChange: (v: string[]) => void;
  max: number;
  lower?: boolean;
}) {
  const [draft, setDraft] = useState("");
  const add = (raw: string) => {
    const parts = raw
      .split(",")
      .map((x) => (lower ? x.trim().toLowerCase() : x.trim()))
      .filter(Boolean);
    const next = [...value];
    for (const p of parts)
      if (!next.some((x) => x.toLowerCase() === p.toLowerCase()) && next.length < max) next.push(p);
    onChange(next);
    setDraft("");
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      if (draft.trim()) add(draft);
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };
  return (
    <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-md bg-surface-3 px-2 py-1.5 focus-within:ring-2 focus-within:ring-accent">
      {value.map((v, i) => (
        <span
          key={v}
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded-full pr-1 pl-2.5 text-[13px] font-medium",
            i === 0 && !lower ? "bg-accent-soft text-accent" : "bg-surface-2",
          )}
        >
          {v}
          <button
            type="button"
            aria-label="×"
            onClick={() => onChange(value.filter((x) => x !== v))}
            className="rounded-full p-0.5 text-muted hover:text-fg"
          >
            <X className="size-3.5" />
          </button>
        </span>
      ))}
      {value.length < max ? (
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          onBlur={() => draft.trim() && add(draft)}
          className="h-8 min-w-[120px] flex-1 bg-transparent px-1 text-sm outline-none"
        />
      ) : null}
    </div>
  );
}

const PLATFORM: Record<string, { label: string; url: (id: string) => string }> = {
  deezer: { label: "Deezer", url: (id) => `https://www.deezer.com/track/${id}` },
  musicbrainz: { label: "MusicBrainz", url: (id) => `https://musicbrainz.org/recording/${id}` },
  itunes: { label: "Apple Music", url: (id) => `https://music.apple.com/song/${id}` },
};

const show = (v: unknown): string =>
  v === null || v === undefined || v === ""
    ? "—"
    : Array.isArray(v)
      ? v.join(", ") || "—"
      : typeof v === "number" && v > 10_000
        ? `${Math.floor(v / 60000)}:${String(Math.round((v % 60000) / 1000)).padStart(2, "0")}`
        : String(v);

/** Що показала звірка з офіційними платформами: де знайдено, що змінено, де джерела розходяться. */
function CheckPanel({ check }: { check: CatalogCheck | null }) {
  const { t } = useI18n();
  const fieldLabel = (f: string) => t(`admin.check.field.${f}` as "admin.check.field.isrc") || f;
  if (!check) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-line px-3 py-2.5 text-sm text-muted">
        <ShieldQuestion className="size-4" /> {t("admin.check.title")}: {t("admin.check.none")}
      </div>
    );
  }
  const ok = check.status === "verified";
  const applied = Object.entries(check.applied);
  const conflicts = Object.entries(check.conflicts);
  return (
    <div
      className={cn(
        "space-y-2.5 rounded-lg border px-3 py-3 text-sm",
        ok ? "border-line" : "border-accent/40 bg-accent-soft/40",
      )}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        {ok ? (
          <CheckCircle2 className="size-4 text-accent" />
        ) : (
          <AlertTriangle className="size-4 text-accent" />
        )}
        <span className="font-semibold">
          {t("admin.check.title")}: {t(`admin.check.${check.status}` as "admin.check.verified")}
        </span>
        <span className="text-xs text-subtle">{new Date(check.checkedAt).toLocaleString("uk-UA")}</span>
        <span className="ml-auto flex flex-wrap gap-2">
          {Object.entries(check.ids)
            .filter(([k]) => PLATFORM[k])
            .map(([k, id]) => (
              <a
                key={k}
                href={PLATFORM[k]!.url(id)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-full bg-surface-3 px-2.5 py-0.5 text-xs font-semibold hover:text-accent"
              >
                {PLATFORM[k]!.label} <ExternalLink className="size-3" />
              </a>
            ))}
        </span>
      </div>
      {applied.length ? (
        <div>
          <div className="mb-1 text-xs font-bold text-muted">{t("admin.check.applied")}</div>
          <ul className="space-y-0.5 text-[13px]">
            {applied.map(([f, a]) => (
              <li key={f}>
                <span className="font-medium">{fieldLabel(f)}:</span>{" "}
                <span className="text-muted line-through">{show(a.from)}</span> → {show(a.to)}{" "}
                <span className="text-xs text-subtle">({a.sources.join(" + ")})</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {conflicts.length ? (
        <div>
          <div className="mb-1 text-xs font-bold text-muted">{t("admin.check.conflicts")}</div>
          <ul className="space-y-0.5 text-[13px]">
            {conflicts.map(([f, c]) => (
              <li key={f}>
                <span className="font-medium">{fieldLabel(f)}:</span>{" "}
                {Object.entries(c)
                  .filter(([k]) => k !== "reason" && k !== "isrcYear")
                  .map(([k, v]) => `${k === "db" ? "N'Owl" : (PLATFORM[k]?.label ?? k)} ${show(v)}`)
                  .join(" · ")}
                {c.reason === "reissue" ? (
                  <span className="text-xs text-subtle">
                    {" "}
                    — {t("admin.check.reissue", { year: String(c.isrcYear) })}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
