"use client";
import { type Conversation, endpoints, type Message } from "@musicdb/contracts/client";
import { formatRelative } from "@musicdb/i18n";
import { invalidate, useApi, useEndpoint, useInfiniteEndpoint, useMe } from "@musicdb/sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  FileText,
  MessageCircle,
  MoreHorizontal,
  Paperclip,
  Play,
  Send,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { ArtistLinks } from "@/components/music/common";
import { Button, IconButton } from "@/components/ui/button";
import { Avatar, Cover } from "@/components/ui/cover";
import { DropdownMenu } from "@/components/ui/menu";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { uploadFile } from "@/lib/upload";
import { playerStore } from "@/player/store";

export function MessagesView({ conversationId }: { conversationId?: string }) {
  const { t } = useI18n();
  const me = useMe().data;
  if (!me) {
    return (
      <div className="py-24 text-center">
        <Button asChild>
          <Link href="/login?next=/messages">{t("common.signIn")}</Link>
        </Button>
      </div>
    );
  }
  return (
    <div className="grid h-[calc(100dvh-16px-64px-84px-16px)] min-h-[480px] grid-cols-1 gap-0 px-2 pb-2 md:grid-cols-[340px_minmax(0,1fr)] max-md:h-[calc(100dvh-64px-150px)]">
      <div
        className={cn(
          "min-h-0 overflow-hidden rounded-l-xl border-r border-line bg-surface-2/40",
          conversationId && "max-md:hidden",
        )}
      >
        <ConversationList activeId={conversationId} />
      </div>
      <div
        className={cn(
          "min-h-0 overflow-hidden rounded-r-xl bg-surface-2/20",
          !conversationId && "max-md:hidden",
        )}
      >
        {conversationId ? (
          <ConversationPane id={conversationId} />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-muted">
            <MessageCircle className="size-12" />
            <p>{t("messages.empty")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function ConversationList({ activeId }: { activeId: string | undefined }) {
  const { t, locale } = useI18n();
  const [folder, setFolder] = useState<"inbox" | "requests">("inbox");
  const list = useInfiniteEndpoint(endpoints.conversations.list, { query: { folder, limit: 30 } });
  const items = useMemo(() => list.data?.pages.flatMap((p) => p.items as Conversation[]) ?? [], [list.data]);
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-2 p-4">
        <h1 className="flex-1 text-2xl font-black tracking-tight">{t("messages.title")}</h1>
      </div>
      <div className="flex gap-2 px-4 pb-3">
        {(["inbox", "requests"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFolder(f)}
            className={cn(
              "h-8 rounded-full px-3 text-sm font-semibold",
              folder === f ? "bg-accent text-on-accent" : "bg-surface-2 hover:bg-surface-3",
            )}
          >
            {f === "inbox" ? t("messages.title") : t("messages.requests")}
          </button>
        ))}
      </div>
      {folder === "requests" ? (
        <p className="px-4 pb-2 text-xs text-muted">{t("messages.requestsHint")}</p>
      ) : null}
      <ul className="scroll-area min-h-0 flex-1 overflow-y-auto px-2">
        {items.map((c) => (
          <li key={c.id}>
            <Link
              href={`/messages/${c.id}`}
              className={cn(
                "flex items-center gap-3 rounded-lg p-3 hover:bg-surface-2",
                activeId === c.id && "bg-surface-3 hover:bg-surface-3",
              )}
            >
              <Avatar src={c.peer.image} name={c.peer.name} size={48} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className={cn("truncate font-semibold", c.unreadCount > 0 && "text-fg")}>
                    {c.peer.name}
                  </span>
                  {c.lastMessage ? (
                    <span className="ml-auto shrink-0 text-xs text-subtle">
                      {formatRelative(c.lastMessage.createdAt, t, locale)}
                    </span>
                  ) : null}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      "truncate text-sm",
                      c.unreadCount > 0 ? "font-semibold text-fg" : "text-muted",
                    )}
                  >
                    {c.lastMessage ? preview(c.lastMessage, t("messages.deleted")) : ""}
                  </span>
                  {c.unreadCount > 0 ? (
                    <span className="ml-auto flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-accent px-1.5 text-[11px] font-bold text-on-accent">
                      {c.unreadCount}
                    </span>
                  ) : null}
                </div>
              </div>
            </Link>
          </li>
        ))}
        {!list.isLoading && !items.length ? (
          <li className="p-6 text-center text-sm text-muted">{t("common.empty")}</li>
        ) : null}
      </ul>
    </div>
  );
}

function preview(m: Message, deleted: string) {
  if (m.deleted) return deleted;
  if (m.body) return m.body;
  if (m.track) return `🎵 ${m.track.title}`;
  if (m.attachment) return `📎 ${m.attachment.name}`;
  return "";
}

function ConversationPane({ id }: { id: string }) {
  const { t, locale } = useI18n();
  const api = useApi();
  const qc = useQueryClient();
  const me = useMe().data!;
  const conv = useEndpoint(endpoints.conversations.get, { params: { id } });
  const list = useInfiniteEndpoint(endpoints.conversations.messages, {
    params: { id },
    query: { limit: 40 },
  });
  const messages = useMemo(
    () => [...(list.data?.pages.flatMap((p) => p.items as Message[]) ?? [])].reverse(),
    [list.data],
  );
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const lastId = messages.at(-1)?.id;

  // biome-ignore lint/correctness/useExhaustiveDependencies: прокрутка саме при новому повідомленні
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [lastId]);

  // Відкрита розмова — непрочитане зникає.
  useEffect(() => {
    if (!conv.data?.unreadCount) return;
    void api.conversations
      .read({ params: { id } })
      .then(() =>
        invalidate(qc, endpoints.conversations.list, endpoints.me.badges, endpoints.conversations.get),
      );
  }, [conv.data?.unreadCount, id, api, qc]);

  const refresh = () =>
    invalidate(
      qc,
      endpoints.conversations.messages,
      endpoints.conversations.list,
      endpoints.conversations.get,
    );

  const send = async (extra: { attachmentUploadId?: string } = {}) => {
    if (!text.trim() && !extra.attachmentUploadId) return;
    setBusy(true);
    try {
      await api.conversations.send({ params: { id }, body: { body: text.trim(), ...extra } });
      setText("");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("errors.generic"));
    } finally {
      setBusy(false);
    }
  };

  const attach = async (file: File) => {
    setBusy(true);
    try {
      const { uploadId } = await uploadFile(file, "attachment");
      await send({ attachmentUploadId: uploadId });
    } catch {
      toast.error(t("errors.generic"));
      setBusy(false);
    }
  };

  const c = conv.data;
  return (
    <div className="flex h-full flex-col">
      {c ? (
        <div className="flex items-center gap-3 border-b border-line p-3">
          <Link href="/messages" className="md:hidden" aria-label={t("common.back")}>
            <ArrowLeft className="size-5" />
          </Link>
          <Link
            href={`/user/${c.peer.username ?? c.peer.id}`}
            className="flex min-w-0 flex-1 items-center gap-3"
          >
            <Avatar src={c.peer.image} name={c.peer.name} size={40} />
            <span className="truncate font-bold hover:underline">{c.peer.name}</span>
          </Link>
          <DropdownMenu
            items={[
              {
                label: t("messages.clear"),
                icon: <Trash2 />,
                danger: true,
                onSelect: async () => {
                  await api.conversations.clear({ params: { id } });
                  await refresh();
                },
              },
            ]}
            trigger={
              <IconButton label={t("common.more")}>
                <MoreHorizontal className="size-5" />
              </IconButton>
            }
          />
        </div>
      ) : null}

      <div className="scroll-area min-h-0 flex-1 space-y-1 overflow-y-auto p-4">
        {list.hasNextPage ? (
          <div className="pb-2 text-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => list.fetchNextPage()}
              loading={list.isFetchingNextPage}
            >
              {t("common.more")}
            </Button>
          </div>
        ) : null}
        {messages.map((m, i) => {
          const mine = m.sender?.id === me.id;
          const prev = messages[i - 1];
          const grouped =
            prev &&
            prev.sender?.id === m.sender?.id &&
            new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() < 5 * 60_000;
          return (
            <div
              key={m.id}
              className={cn("group flex", mine ? "justify-end" : "justify-start", !grouped && "pt-2")}
            >
              <div className={cn("max-w-[78%] space-y-1", mine && "items-end")}>
                <div
                  className={cn(
                    "rounded-2xl px-3.5 py-2 text-[15px] break-words whitespace-pre-line",
                    mine ? "rounded-br-md bg-accent text-on-accent" : "rounded-bl-md bg-surface-3",
                    m.deleted && "bg-transparent text-subtle italic ring-1 ring-line",
                  )}
                >
                  {m.deleted ? t("messages.deleted") : m.body}
                  {m.track ? <SharedTrack track={m.track} /> : null}
                  {m.attachment ? (
                    m.attachment.mimeType.startsWith("image/") && m.attachment.url ? (
                      <a href={m.attachment.url} target="_blank" rel="noreferrer" className="mt-1 block">
                        <img src={m.attachment.url} alt={m.attachment.name} className="max-h-72 rounded-lg" />
                      </a>
                    ) : (
                      <a
                        href={m.attachment.url ?? "#"}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-1 flex items-center gap-2 rounded-lg bg-black/15 p-2 text-sm"
                      >
                        <FileText className="size-5 shrink-0" />
                        <span className="truncate">{m.attachment.name}</span>
                      </a>
                    )
                  ) : null}
                </div>
                {!grouped || i === messages.length - 1 ? (
                  <div
                    className={cn(
                      "flex items-center gap-2 px-1 text-[11px] text-subtle",
                      mine && "justify-end",
                    )}
                  >
                    {formatRelative(m.createdAt, t, locale)}
                    {mine && !m.deleted ? (
                      <button
                        type="button"
                        className="opacity-0 group-hover:opacity-100 hover:text-danger"
                        onClick={async () => {
                          await api.conversations.deleteMessage({ params: { id: m.id } });
                          await refresh();
                        }}
                      >
                        {t("common.delete")}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {c?.state === "request" ? (
        <div className="flex items-center justify-center gap-3 border-t border-line p-4">
          <Button
            variant="accent"
            onClick={async () => {
              await api.conversations.respond({ params: { id }, body: { accept: true } });
              await refresh();
            }}
          >
            {t("messages.accept")}
          </Button>
          <Button
            variant="outline"
            onClick={async () => {
              await api.conversations.respond({ params: { id }, body: { accept: false } });
              await refresh();
            }}
          >
            {t("messages.decline")}
          </Button>
        </div>
      ) : null}
      {c?.state === "declined" ? (
        <p className="border-t border-line p-4 text-center text-sm text-muted">{t("messages.declined")}</p>
      ) : null}
      {c && c.state !== "declined" ? (
        <div className="border-t border-line p-3">
          {c.state === "pending" ? (
            <p className="pb-2 text-center text-xs text-muted">{t("messages.pending")}</p>
          ) : null}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send();
            }}
            className="flex items-end gap-2"
          >
            <IconButton
              label={t("messages.attach")}
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={busy}
            >
              <Paperclip className="size-5" />
            </IconButton>
            <input
              ref={fileRef}
              type="file"
              hidden
              onChange={(e) => e.target.files?.[0] && attach(e.target.files[0])}
            />
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  void send();
                }
              }}
              rows={1}
              maxLength={4000}
              placeholder={t("messages.placeholder")}
              className="max-h-40 min-h-11 flex-1 resize-none rounded-3xl bg-surface-3 px-4 py-3 text-[15px] outline-none focus:ring-2 focus:ring-accent"
            />
            <IconButton
              label={t("common.send")}
              type="submit"
              disabled={busy || !text.trim()}
              className="bg-accent text-on-accent hover:text-on-accent"
            >
              <Send className="size-5" />
            </IconButton>
          </form>
        </div>
      ) : null}
    </div>
  );
}

function SharedTrack({ track }: { track: NonNullable<Message["track"]> }) {
  return (
    <div className="mt-1.5 flex items-center gap-3 rounded-lg bg-black/20 p-2">
      <Cover
        src={track.release?.coverUrl}
        alt=""
        size={48}
        seed={track.release?.id ?? track.id}
        rounded="sm"
        className="size-12"
      />
      <div className="min-w-0 flex-1">
        <Link href={`/track/${track.id}`} className="block truncate text-sm font-bold hover:underline">
          {track.title}
        </Link>
        <ArtistLinks artists={track.artists} className="block text-xs opacity-80" />
      </div>
      <button
        type="button"
        aria-label="play"
        onClick={() => playerStore.getState().playTrack(track, { type: "queue", name: track.title })}
        className="flex size-9 items-center justify-center rounded-full bg-white text-black"
      >
        <Play className="size-4 translate-x-[1px]" fill="currentColor" strokeWidth={0} />
      </button>
    </div>
  );
}
