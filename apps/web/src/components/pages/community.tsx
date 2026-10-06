"use client";
import { endpoints, type Post, type Thread, type Track } from "@musicdb/contracts/client";
import { formatRelative } from "@musicdb/i18n";
import { invalidate, useApi, useEndpoint, useInfiniteEndpoint, useMe } from "@musicdb/sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { Flag, Lock, MessageSquare, Pin, Plus, Reply, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { TrackList } from "@/components/music/track-list";
import { useReportDialog } from "@/components/report-dialog";
import { Button, IconButton } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import { Avatar } from "@/components/ui/cover";
import { Dialog } from "@/components/ui/dialog";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { useAuthGate } from "@/lib/use-auth-gate";

type Tab = "threads" | "tracks" | "people";

export function CommunityView() {
  const { t } = useI18n();
  const me = useMe().data;
  const [tab, setTab] = useState<Tab>("threads");
  const [creating, setCreating] = useState(false);
  const gate = useAuthGate();
  return (
    <div className="mx-auto max-w-5xl space-y-6 px-4 pt-4 pb-10 sm:px-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="serif-title text-3xl">{t("community.title")}</h1>
        {tab === "threads" ? (
          <Button variant="accent" size="sm" onClick={gate(() => setCreating(true))}>
            <Plus className="size-4" /> {t("community.newThread")}
          </Button>
        ) : null}
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {(
          [
            ["threads", t("community.threads")],
            ["tracks", t("community.tracks")],
            ...(me ? [["people", t("community.people")] as const] : []),
          ] as [Tab, string][]
        ).map(([k, label]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={cn(
              "h-8 shrink-0 rounded-full px-3 text-sm font-semibold",
              tab === k ? "bg-accent text-on-accent" : "bg-surface-2 hover:bg-surface-3",
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === "threads" ? <ThreadList /> : tab === "tracks" ? <CommunityTracks /> : <SimilarPeople />}
      <NewThreadDialog open={creating} onOpenChange={setCreating} />
    </div>
  );
}

function ThreadList() {
  const { t, locale } = useI18n();
  const list = useInfiniteEndpoint(endpoints.threads.list, { query: { limit: 30 } });
  const threads = useMemo(() => list.data?.pages.flatMap((p) => p.items as Thread[]) ?? [], [list.data]);
  if (list.isLoading) return <div className="skeleton h-64 rounded-lg" />;
  if (!threads.length) return <p className="py-16 text-center text-muted">{t("common.empty")}</p>;
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-xl bg-surface-2/60">
      {threads.map((th) => (
        <li key={th.id}>
          <Link
            href={`/community/${th.id}`}
            className="flex items-start gap-4 p-4 transition-colors hover:bg-surface-2"
          >
            <Avatar src={th.author?.image} name={th.author?.name ?? "?"} size={40} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                {th.pinned ? <Pin className="size-4 shrink-0 fill-accent text-accent" /> : null}
                {th.locked ? <Lock className="size-4 shrink-0 text-muted" /> : null}
                <span className={cn("truncate text-[15px] font-bold", th.unread && "text-accent")}>
                  {th.title}
                </span>
                {th.unread ? <span className="size-2 shrink-0 rounded-full bg-accent" /> : null}
              </div>
              <p className="mt-0.5 line-clamp-1 text-sm text-muted">{th.body}</p>
              <div className="mt-1.5 flex items-center gap-3 text-xs text-subtle">
                <span>{th.author?.name ?? "—"}</span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="size-3.5" /> {t("community.replies", { count: th.postCount })}
                </span>
                <span>{formatRelative(th.lastPostAt, t, locale)}</span>
              </div>
            </div>
          </Link>
        </li>
      ))}
      {list.hasNextPage ? (
        <li className="p-3 text-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => list.fetchNextPage()}
            loading={list.isFetchingNextPage}
          >
            {t("common.more")}
          </Button>
        </li>
      ) : null}
    </ul>
  );
}

function CommunityTracks() {
  const { t } = useI18n();
  const list = useInfiniteEndpoint(endpoints.tracks.browse, {
    query: { source: "community", sort: "newest", limit: 50 },
  });
  const tracks = useMemo(() => list.data?.pages.flatMap((p) => p.items as Track[]) ?? [], [list.data]);
  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" asChild>
          <Link href="/upload">{t("nav.upload")}</Link>
        </Button>
      </div>
      <TrackList
        items={tracks.map((track) => ({ track }))}
        context={{ type: "queue", name: t("community.tracks") }}
      />
    </div>
  );
}

function SimilarPeople() {
  const { t } = useI18n();
  const { data, isLoading } = useEndpoint(endpoints.discover.taste);
  if (isLoading) return <div className="skeleton h-64 rounded-lg" />;
  if (!data?.items.length) return <p className="py-16 text-center text-muted">{t("common.empty")}</p>;
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {data.items.map((p) => (
        <Link
          key={p.user.id}
          href={`/user/${p.user.username ?? p.user.id}`}
          className="flex items-center gap-4 rounded-xl bg-surface-2 p-4 hover:bg-surface-3"
        >
          <Avatar src={p.user.image} name={p.user.name} size={56} />
          <div className="min-w-0">
            <div className="truncate font-bold">{p.user.name}</div>
            <div className="text-sm font-bold text-accent">{t("profile.tasteMatch", { value: p.match })}</div>
            <div className="truncate text-xs text-muted">{p.sharedArtists.map((a) => a.name).join(", ")}</div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function NewThreadDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const { t } = useI18n();
  const api = useApi();
  const router = useRouter();
  const qc = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("community.newThread")}
      className="max-w-[560px]"
    >
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          try {
            const th = await api.threads.create({ body: { title: title.trim(), body: body.trim() } });
            await invalidate(qc, endpoints.threads.list);
            onOpenChange(false);
            setTitle("");
            setBody("");
            router.push(`/community/${th.id}`);
          } catch {
            toast.error(t("errors.validation_failed"));
          } finally {
            setBusy(false);
          }
        }}
      >
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("community.titleLabel")}
          maxLength={200}
          className="h-11 w-full rounded-md bg-surface-3 px-3 font-semibold outline-none focus:ring-2 focus:ring-accent"
        />
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder={t("community.bodyLabel")}
          rows={6}
          maxLength={10_000}
          className="w-full resize-none rounded-md bg-surface-3 p-3 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
        <div className="flex justify-end">
          <Button
            type="submit"
            variant="accent"
            loading={busy}
            disabled={title.trim().length < 3 || !body.trim()}
          >
            {t("common.send")}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}

export function ThreadView({ id }: { id: string }) {
  const { t, locale } = useI18n();
  const api = useApi();
  const qc = useQueryClient();
  const me = useMe().data;
  const gate = useAuthGate();
  const report = useReportDialog();
  const router = useRouter();
  const { data, isLoading, error } = useEndpoint(endpoints.threads.get, { params: { id } });
  const [body, setBody] = useState("");
  const [replyTo, setReplyTo] = useState<Post | null>(null);
  const [busy, setBusy] = useState(false);

  if (isLoading) return <div className="mx-auto mt-6 h-96 max-w-3xl skeleton rounded-xl" />;
  if (error || !data) return <p className="py-24 text-center text-muted">{t("common.notFound")}</p>;

  const refresh = () => invalidate(qc, endpoints.threads.get, endpoints.threads.list);

  const send = async () => {
    setBusy(true);
    try {
      await api.threads.reply({
        params: { id },
        body: { body: body.trim(), ...(replyTo ? { replyToId: replyTo.id } : {}) },
      });
      setBody("");
      setReplyTo(null);
      await refresh();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pt-4 pb-10 sm:px-6">
      <Link href="/community" className="text-sm font-bold text-muted hover:text-fg">
        ← {t("community.title")}
      </Link>
      <article className="rounded-xl bg-surface-2 p-5">
        <div className="mb-3 flex items-center gap-3">
          <Avatar src={data.author?.image} name={data.author?.name ?? "?"} size={40} />
          <div className="min-w-0 flex-1">
            <div className="font-bold">{data.author?.name ?? "—"}</div>
            <div className="text-xs text-subtle">{formatRelative(data.createdAt, t, locale)}</div>
          </div>
          {me ? (
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (data.viewer?.subscribed) await api.threads.unsubscribe({ params: { id } });
                else await api.threads.subscribe({ params: { id } });
                await refresh();
              }}
            >
              {data.viewer?.subscribed ? t("community.unfollow") : t("community.follow")}
            </Button>
          ) : null}
        </div>
        <h1 className="serif-title text-2xl">{data.title}</h1>
        <p className="mt-3 text-[15px] leading-relaxed whitespace-pre-line text-fg/90">{data.body}</p>
        {me && (data.author?.id === me.id || data.viewer?.canModerate) ? (
          <div className="mt-4 flex justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                if (!(await confirm({ title: t("confirm.deleteThread"), danger: true }))) return;
                await api.threads.delete({ params: { id } });
                await invalidate(qc, endpoints.threads.list);
                router.push("/community");
              }}
            >
              <Trash2 className="size-4" /> {t("common.delete")}
            </Button>
          </div>
        ) : null}
      </article>

      <ul className="space-y-2">
        {data.posts.map((p) => (
          <li key={p.id} className="group rounded-xl p-4 hover:bg-surface-2/60">
            <div className="flex items-start gap-3">
              <Avatar src={p.author?.image} name={p.author?.name ?? "?"} size={36} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 text-sm">
                  {p.author ? (
                    <Link
                      href={`/user/${p.author.username ?? p.author.id}`}
                      className="font-bold hover:underline"
                    >
                      {p.author.name}
                    </Link>
                  ) : (
                    <span className="font-bold">—</span>
                  )}
                  <span className="text-xs text-subtle">{formatRelative(p.createdAt, t, locale)}</span>
                </div>
                {p.replyTo ? (
                  <blockquote className="mt-1.5 border-l-2 border-accent/60 pl-3 text-sm text-muted">
                    <span className="font-semibold">{p.replyTo.author?.name}</span>: {p.replyTo.excerpt}
                  </blockquote>
                ) : null}
                <p className={cn("mt-1 text-[15px] whitespace-pre-line", p.deleted && "text-subtle italic")}>
                  {p.deleted ? t("messages.deleted") : p.body}
                </p>
              </div>
              {!p.deleted ? (
                <div className="flex opacity-0 transition-opacity group-hover:opacity-100">
                  <IconButton label={t("community.reply")} size="sm" onClick={gate(() => setReplyTo(p))}>
                    <Reply className="size-4" />
                  </IconButton>
                  {me ? (
                    <IconButton
                      label={t("common.report")}
                      size="sm"
                      onClick={() => report.open({ targetType: "post", targetId: p.id })}
                    >
                      <Flag className="size-4" />
                    </IconButton>
                  ) : null}
                  {me && (p.author?.id === me.id || data.viewer?.canModerate) ? (
                    <IconButton
                      label={t("common.delete")}
                      size="sm"
                      onClick={async () => {
                        await api.threads.deletePost({ params: { id: p.id } });
                        await refresh();
                      }}
                    >
                      <Trash2 className="size-4" />
                    </IconButton>
                  ) : null}
                </div>
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      {me && !data.locked ? (
        <div className="sticky bottom-28 rounded-xl bg-surface-2 p-3 shadow-xl ring-1 ring-line md:bottom-4">
          {replyTo ? (
            <div className="mb-2 flex items-center justify-between rounded-md bg-surface-3 px-3 py-1.5 text-xs text-muted">
              <span className="truncate">
                {t("community.replyingTo", { name: replyTo.author?.name ?? "" })}: {replyTo.body.slice(0, 80)}
              </span>
              <button type="button" onClick={() => setReplyTo(null)} aria-label={t("common.cancel")}>
                <X className="size-4" />
              </button>
            </div>
          ) : null}
          <div className="flex items-end gap-2">
            <textarea
              value={body}
              onChange={(e) => setBody(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && body.trim()) void send();
              }}
              rows={2}
              maxLength={10_000}
              placeholder={t("community.reply")}
              className="min-h-11 flex-1 resize-none rounded-md bg-surface-3 p-3 text-sm outline-none focus:ring-2 focus:ring-accent"
            />
            <Button variant="accent" onClick={send} loading={busy} disabled={!body.trim()}>
              {t("common.send")}
            </Button>
          </div>
        </div>
      ) : data.locked ? (
        <p className="flex items-center gap-2 text-sm text-muted">
          <Lock className="size-4" /> {t("community.locked")}
        </p>
      ) : null}
    </div>
  );
}
