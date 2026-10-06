"use client";
import { endpoints, type Submission } from "@musicdb/contracts/client";
import { formatRelative } from "@musicdb/i18n";
import { ApiError } from "@musicdb/sdk";
import { invalidate, useApi, useEndpoint, useInfiniteEndpoint, useMe } from "@musicdb/sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, CloudUpload, Loader2, Music, XCircle } from "lucide-react";
import Link from "next/link";
import { type DragEvent, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { uploadFile } from "@/lib/upload";

type Mode = "community" | "catalog";

export function UploadView() {
  const { t } = useI18n();
  const me = useMe().data;
  const [mode, setMode] = useState<Mode>("community");
  if (!me) {
    return (
      <div className="py-24 text-center">
        <Button asChild>
          <Link href="/login?next=/upload">{t("common.signIn")}</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 pt-4 pb-10 sm:px-6">
      <div>
        <h1 className="serif-title text-3xl">
          {mode === "community" ? t("upload.title") : t("upload.catalogRequest")}
        </h1>
        <p className="mt-1 text-muted">{t("upload.subtitle")}</p>
      </div>
      <div className="flex gap-2">
        {(["community", "catalog"] as Mode[]).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "h-8 rounded-full px-3 text-sm font-semibold",
              mode === m ? "bg-accent text-on-accent" : "bg-surface-2 hover:bg-surface-3",
            )}
          >
            {m === "community" ? t("upload.title") : t("upload.catalogRequest")}
          </button>
        ))}
      </div>
      <SubmissionForm key={mode} mode={mode} />
      <MySubmissions />
    </div>
  );
}

function SubmissionForm({ mode }: { mode: Mode }) {
  const { t } = useI18n();
  const api = useApi();
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [form, setForm] = useState({
    title: "",
    artists: "",
    album: "",
    date: "",
    genres: "",
    youtube: "",
    lyrics: "",
    explicit: false,
    rights: false,
  });
  const [busy, setBusy] = useState(false);
  const status = useEndpoint(
    endpoints.uploads.status,
    { params: { id: uploadId ?? "" } },
    {
      enabled: !!uploadId,
      refetchInterval: (q) =>
        q.state.data?.status === "processing" || q.state.data?.status === "uploaded" ? 2000 : false,
    },
  );

  const pick = async (f: File) => {
    setFile(f);
    setProgress(0);
    setUploadId(null);
    if (!form.title) setForm((s) => ({ ...s, title: f.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ") }));
    try {
      const { uploadId: id } = await uploadFile(f, "track_audio", setProgress);
      setUploadId(id);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("upload.failed"));
      setFile(null);
    }
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) void pick(f);
  };

  const audioState = status.data?.status;
  const canSubmit =
    form.title.trim() &&
    form.artists.trim() &&
    (mode === "catalog" || (uploadId && audioState !== "failed" && form.rights));

  const submit = async () => {
    setBusy(true);
    try {
      const list = (s: string) =>
        s
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
      await api.submissions.create({
        body: {
          kind: mode === "community" ? "community_track" : "catalog_track",
          track: {
            title: form.title.trim(),
            artists: list(form.artists),
            ...(form.album.trim() ? { releaseTitle: form.album.trim() } : {}),
            ...(form.date ? { releaseDate: form.date } : {}),
            genres: list(form.genres).slice(0, 5),
            ...(form.youtube.trim() ? { youtubeUrl: form.youtube.trim() } : {}),
            ...(form.lyrics.trim() ? { lyrics: form.lyrics } : {}),
            explicit: form.explicit,
            ...(uploadId && mode === "community" ? { audioUploadId: uploadId } : {}),
            ...(status.data?.durationMs ? { durationMs: status.data.durationMs } : {}),
          },
        },
      });
      toast(t("upload.submitted"));
      await invalidate(qc, endpoints.submissions.mine);
      setForm({
        title: "",
        artists: "",
        album: "",
        date: "",
        genres: "",
        youtube: "",
        lyrics: "",
        explicit: false,
        rights: false,
      });
      setFile(null);
      setUploadId(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : t("errors.generic"));
    } finally {
      setBusy(false);
    }
  };

  const input = "h-11 w-full rounded-md bg-surface-2 px-3 outline-none focus:ring-2 focus:ring-accent";
  return (
    <div className="space-y-5">
      {mode === "community" ? (
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            "flex w-full flex-col items-center gap-3 rounded-xl border-2 border-dashed border-line-strong p-10 text-center transition-colors hover:border-fg/60",
            dragging && "border-accent bg-accent-soft",
          )}
        >
          {file ? (
            <>
              {audioState === "ready" ? (
                <CheckCircle2 className="size-10 text-success" />
              ) : audioState === "failed" ? (
                <XCircle className="size-10 text-danger" />
              ) : uploadId ? (
                <Loader2 className="size-10 animate-spin text-accent" />
              ) : (
                <Music className="size-10 text-accent" />
              )}
              <span className="font-bold">{file.name}</span>
              {!uploadId ? (
                <div className="h-1.5 w-64 overflow-hidden rounded-full bg-surface-3">
                  <div
                    className="h-full bg-accent transition-[width]"
                    style={{ width: `${Math.round(progress * 100)}%` }}
                  />
                </div>
              ) : (
                <span className="text-sm text-muted">
                  {audioState === "ready"
                    ? t("upload.ready")
                    : audioState === "failed"
                      ? t("upload.failed")
                      : t("upload.processing")}
                </span>
              )}
            </>
          ) : (
            <>
              <CloudUpload className="size-10 text-muted" />
              <span className="font-bold">{t("upload.chooseFile")}</span>
              <span className="text-sm text-muted">
                {t("upload.dropHere")} · {t("upload.formats")}
              </span>
            </>
          )}
        </button>
      ) : null}
      <input
        ref={fileRef}
        type="file"
        accept="audio/*,video/mp4,video/webm"
        hidden
        onChange={(e) => e.target.files?.[0] && pick(e.target.files[0])}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs font-bold text-muted">{t("upload.titleLabel")} *</span>
          <input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            maxLength={300}
            className={input}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-muted">{t("upload.artistsLabel")} *</span>
          <input
            value={form.artists}
            onChange={(e) => setForm({ ...form, artists: e.target.value })}
            className={input}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-muted">{t("upload.albumLabel")}</span>
          <input
            value={form.album}
            onChange={(e) => setForm({ ...form, album: e.target.value })}
            className={input}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-muted">{t("upload.dateLabel")}</span>
          <input
            type="date"
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className={input}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-bold text-muted">{t("upload.genresLabel")}</span>
          <input
            value={form.genres}
            onChange={(e) => setForm({ ...form, genres: e.target.value })}
            placeholder="metalcore, post-hardcore"
            className={input}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs font-bold text-muted">{t("upload.youtubeLabel")}</span>
          <input
            value={form.youtube}
            onChange={(e) => setForm({ ...form, youtube: e.target.value })}
            placeholder="https://youtu.be/…"
            className={input}
          />
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1.5 block text-xs font-bold text-muted">{t("upload.lyricsLabel")}</span>
          <textarea
            value={form.lyrics}
            onChange={(e) => setForm({ ...form, lyrics: e.target.value })}
            rows={5}
            className="w-full resize-y rounded-md bg-surface-2 p-3 text-sm outline-none focus:ring-2 focus:ring-accent"
          />
        </label>
      </div>
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={form.explicit}
          onChange={(e) => setForm({ ...form, explicit: e.target.checked })}
          className="size-4 accent-[var(--n-accent)]"
        />
        {t("upload.explicitLabel")}
      </label>
      {mode === "community" ? (
        <label className="flex items-start gap-3 text-sm">
          <input
            type="checkbox"
            checked={form.rights}
            onChange={(e) => setForm({ ...form, rights: e.target.checked })}
            className="mt-0.5 size-4 accent-[var(--n-accent)]"
          />
          {t("upload.rights")}
        </label>
      ) : null}
      <Button variant="accent" size="lg" onClick={submit} loading={busy} disabled={!canSubmit}>
        {t("upload.submit")}
      </Button>
    </div>
  );
}

function MySubmissions() {
  const { t, locale } = useI18n();
  const list = useInfiniteEndpoint(endpoints.submissions.mine, { query: { limit: 20 } });
  const items = useMemo(() => list.data?.pages.flatMap((p) => p.items as Submission[]) ?? [], [list.data]);
  if (!items.length) return null;
  const tone = {
    pending: "bg-warning/20 text-warning",
    approved: "bg-success/20 text-success",
    rejected: "bg-danger/20 text-danger",
    withdrawn: "bg-surface-3 text-muted",
  };
  return (
    <section className="space-y-3 border-t border-line pt-8">
      <h2 className="serif-title text-xl">{t("admin.submissions")}</h2>
      <ul className="space-y-2">
        {items.map((s) => (
          <li key={s.id} className="flex items-center gap-3 rounded-lg bg-surface-2 p-3">
            <div className="min-w-0 flex-1">
              <div className="truncate font-semibold">{s.targetLabel}</div>
              <div className="text-xs text-subtle">{formatRelative(s.createdAt, t, locale)}</div>
              {s.reviewNote ? <div className="mt-1 text-sm text-muted">{s.reviewNote}</div> : null}
            </div>
            {s.resultTrackId ? (
              <Link
                href={`/track/${s.resultTrackId}`}
                className="text-sm font-bold text-accent hover:underline"
              >
                →
              </Link>
            ) : null}
            <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold", tone[s.status])}>
              {t(`admin.status.${s.status}`)}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
