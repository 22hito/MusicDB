"use client";
import { endpoints, type Notification } from "@musicdb/contracts/client";
import { formatRelative } from "@musicdb/i18n";
import { invalidate, useApi, useInfiniteEndpoint, useMe } from "@musicdb/sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck, Disc3, MessageSquareReply, UserPlus, XCircle } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/cover";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";

function hrefOf(n: Notification) {
  if (n.entityType === "track" && n.entityId) return `/track/${n.entityId}`;
  if (n.entityType === "thread" && n.entityId) return `/community/${n.entityId}`;
  if (n.entityType === "user" && n.entityId) return `/user/${n.entityId}`;
  if (n.entityType === "playlist" && n.entityId) return `/playlist/${n.entityId}`;
  if (n.entityType === "submission") return "/upload";
  return "#";
}

const icons: Partial<Record<Notification["type"], React.ReactNode>> = {
  follow: <UserPlus className="size-4" />,
  new_release: <Disc3 className="size-4" />,
  thread_reply: <MessageSquareReply className="size-4" />,
  post_reply: <MessageSquareReply className="size-4" />,
  submission_approved: <CheckCheck className="size-4" />,
  submission_rejected: <XCircle className="size-4" />,
};

export function NotificationsView() {
  const { t, locale } = useI18n();
  const me = useMe().data;
  const api = useApi();
  const qc = useQueryClient();
  const list = useInfiniteEndpoint(endpoints.notifications.list, { query: { limit: 40 } }, { enabled: !!me });
  const items = useMemo(() => list.data?.pages.flatMap((p) => p.items as Notification[]) ?? [], [list.data]);

  // Відкриття сторінки позначає все прочитаним (бейдж зникає), але виділення нових лишається до виходу.
  useEffect(() => {
    if (!items.some((n) => !n.read)) return;
    const timer = setTimeout(() => {
      void api.notifications.markRead({ body: {} }).then(() => invalidate(qc, endpoints.me.badges));
    }, 1500);
    return () => clearTimeout(timer);
  }, [items, api, qc]);

  const text = (n: Notification) => {
    const params: Record<string, string | number> = {
      actor: n.actor?.name ?? "",
      ...(n.data as Record<string, string>),
    };
    return t(`notifications.${n.type}` as "notifications.follow", params);
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 pt-4 sm:px-6">
      <div className="flex items-center justify-between">
        <h1 className="serif-title text-3xl">{t("notifications.title")}</h1>
        {items.some((n) => !n.read) ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              api.notifications
                .markRead({ body: {} })
                .then(() => invalidate(qc, endpoints.notifications.list, endpoints.me.badges))
            }
          >
            <CheckCheck className="size-4" /> {t("notifications.markAll")}
          </Button>
        ) : null}
      </div>
      {list.isLoading ? <div className="skeleton h-40 rounded-lg" /> : null}
      {!list.isLoading && !items.length ? (
        <div className="flex flex-col items-center gap-3 py-24 text-muted">
          <Bell className="size-10" />
          <p>{t("notifications.empty")}</p>
        </div>
      ) : null}
      <ul className="space-y-1">
        {items.map((n) => (
          <li key={n.id}>
            <Link
              href={hrefOf(n)}
              className={cn(
                "flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-surface-2",
                !n.read && "bg-accent-soft hover:bg-accent-soft",
              )}
            >
              <div className="relative">
                {n.actor ? (
                  <Avatar src={n.actor.image} name={n.actor.name} size={44} />
                ) : (
                  <span className="flex size-11 items-center justify-center rounded-full bg-surface-3 text-accent">
                    {icons[n.type] ?? <Bell className="size-4" />}
                  </span>
                )}
                {n.actor && icons[n.type] ? (
                  <span className="absolute -right-1 -bottom-1 flex size-5 items-center justify-center rounded-full bg-accent text-on-accent ring-2 ring-surface-1 [&_svg]:size-3">
                    {icons[n.type]}
                  </span>
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] leading-snug">{text(n)}</p>
                {typeof n.data.excerpt === "string" ? (
                  <p className="mt-1 line-clamp-2 text-sm text-muted">«{n.data.excerpt}»</p>
                ) : null}
                {typeof n.data.note === "string" && n.data.note ? (
                  <p className="mt-1 text-sm text-muted">{n.data.note}</p>
                ) : null}
                <p className="mt-1 text-xs text-subtle">{formatRelative(n.createdAt, t, locale)}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      {list.hasNextPage ? (
        <Button variant="ghost" onClick={() => list.fetchNextPage()} loading={list.isFetchingNextPage}>
          {t("common.more")}
        </Button>
      ) : null}
    </div>
  );
}
