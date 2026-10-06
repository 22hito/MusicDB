"use client";
import {
  type AuditEntry,
  type BugReport,
  endpoints,
  type Report,
  type Submission,
} from "@musicdb/contracts/client";
import { formatRelative } from "@musicdb/i18n";
import { invalidate, useApi, useEndpoint, useInfiniteEndpoint, useMe } from "@musicdb/sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, Bug, ClipboardList, Flag, LayoutDashboard, Music, Users } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { TracksAdmin } from "@/components/admin/tracks-admin";
import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import { Avatar } from "@/components/ui/cover";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";

type Tab = "overview" | "songs" | "submissions" | "reports" | "bugs" | "users" | "audit";

export function AdminView() {
  const { t } = useI18n();
  const me = useMe().data;
  const [tab, setTab] = useState<Tab>("submissions");
  if (!me || (me.role !== "admin" && me.role !== "moderator")) {
    return <p className="py-24 text-center text-muted">{t("errors.forbidden")}</p>;
  }
  const tabs: [Tab, string, React.ReactNode][] = [
    ["overview", t("admin.overview"), <LayoutDashboard key="o" className="size-4" />],
    ...(me.role === "admin"
      ? ([["songs", t("admin.songs"), <Music key="m" className="size-4" />]] as [
          Tab,
          string,
          React.ReactNode,
        ][])
      : []),
    ["submissions", t("admin.submissions"), <ClipboardList key="s" className="size-4" />],
    ["reports", t("admin.reports"), <Flag key="r" className="size-4" />],
    ["bugs", t("admin.bugs"), <Bug key="b" className="size-4" />],
    ...(me.role === "admin"
      ? ([["users", t("admin.users"), <Users key="u" className="size-4" />]] as [
          Tab,
          string,
          React.ReactNode,
        ][])
      : []),
    ["audit", t("admin.audit"), <Activity key="a" className="size-4" />],
  ];
  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 pt-4 pb-10 sm:px-6">
      <h1 className="serif-title text-3xl">{t("admin.title")}</h1>
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {tabs.map(([k, label, icon]) => (
          <button
            key={k}
            type="button"
            onClick={() => setTab(k)}
            className={cn(
              "flex h-9 shrink-0 items-center gap-2 rounded-full px-4 text-sm font-semibold",
              tab === k ? "bg-accent text-on-accent" : "bg-surface-2 hover:bg-surface-3",
            )}
          >
            {icon} {label}
          </button>
        ))}
      </div>
      {tab === "overview" ? <Overview /> : null}
      {tab === "songs" ? <TracksAdmin /> : null}
      {tab === "submissions" ? <SubmissionsQueue /> : null}
      {tab === "reports" ? <ReportsQueue /> : null}
      {tab === "bugs" ? <BugReports /> : null}
      {tab === "users" ? <UsersAdmin /> : null}
      {tab === "audit" ? <Audit /> : null}
    </div>
  );
}

function Overview() {
  const { t } = useI18n();
  const { data } = useEndpoint(endpoints.admin.stats);
  if (!data) return <div className="skeleton h-32 rounded-xl" />;
  const cards: [string, number][] = [
    [t("admin.stats.users"), data.users],
    [t("admin.stats.tracks"), data.tracks],
    [t("admin.stats.community"), data.communityTracks],
    [t("admin.stats.artists"), data.artists],
    [t("admin.stats.playsToday"), data.playsToday],
    [t("admin.stats.pending"), data.pendingSubmissions],
    [t("admin.stats.reports"), data.openReports],
    [t("admin.stats.bugs"), data.openBugReports],
  ];
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {cards.map(([label, value]) => (
        <div key={label} className="rounded-xl bg-surface-2 p-5">
          <div className="text-xs font-semibold tracking-wide text-muted uppercase">{label}</div>
          <div className="mt-1 text-3xl font-black tabular-nums">{value.toLocaleString()}</div>
        </div>
      ))}
    </div>
  );
}

function SubmissionsQueue() {
  const { t, locale } = useI18n();
  const api = useApi();
  const qc = useQueryClient();
  const [status, setStatus] = useState<"pending" | "approved" | "rejected">("pending");
  const list = useInfiniteEndpoint(endpoints.admin.submissions, { query: { status, limit: 20 } });
  const items = useMemo(() => list.data?.pages.flatMap((p) => p.items as Submission[]) ?? [], [list.data]);
  const [notes, setNotes] = useState<Record<string, string>>({});

  const review = async (s: Submission, decision: "approve" | "reject") => {
    try {
      await api.admin.review({
        params: { id: s.id },
        body: { decision, ...(notes[s.id] ? { note: notes[s.id] } : {}) },
      });
      toast(decision === "approve" ? t("admin.approve") : t("admin.reject"));
      await invalidate(qc, endpoints.admin.submissions, endpoints.me.badges);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t("errors.generic"));
    }
  };

  return (
    <div className="space-y-4">
      <StatusTabs value={status} onChange={setStatus} options={["pending", "approved", "rejected"]} />
      {!list.isLoading && !items.length ? (
        <p className="py-10 text-center text-muted">{t("common.empty")}</p>
      ) : null}
      {items.map((s) => {
        const p = s.payload as Record<string, unknown>;
        return (
          <article key={s.id} className="space-y-3 rounded-xl bg-surface-2 p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-surface-3 px-2.5 py-1 text-xs font-bold">{s.kind}</span>
              <span className="font-bold">{s.targetLabel}</span>
              <span className="ml-auto text-xs text-subtle">
                {s.submitter?.name} · {formatRelative(s.createdAt, t, locale)}
              </span>
            </div>
            <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
              {Object.entries(p)
                .filter(
                  ([k, v]) =>
                    v !== null &&
                    v !== undefined &&
                    v !== "" &&
                    k !== "audioUploadId" &&
                    !(Array.isArray(v) && !v.length),
                )
                .map(([k, v]) => (
                  <div key={k} className="flex gap-2">
                    <dt className="shrink-0 text-muted">{k}:</dt>
                    <dd className="min-w-0 truncate">{Array.isArray(v) ? v.join(", ") : String(v)}</dd>
                  </div>
                ))}
            </dl>
            {s.audio?.url ? (
              // biome-ignore lint/a11y/useMediaCaption: прослуховування заявки модератором, субтитрів немає
              <audio controls preload="none" src={s.audio.url} className="w-full" />
            ) : null}
            {s.targetType && s.targetId ? (
              <Link
                href={`/${s.targetType === "release" ? "album" : s.targetType}/${s.targetId}`}
                className="text-sm font-bold text-accent hover:underline"
              >
                → {s.targetLabel}
              </Link>
            ) : null}
            {s.status === "pending" ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  value={notes[s.id] ?? ""}
                  onChange={(e) => setNotes({ ...notes, [s.id]: e.target.value })}
                  placeholder={t("admin.note")}
                  className="h-9 min-w-48 flex-1 rounded-md bg-surface-3 px-3 text-sm outline-none focus:ring-2 focus:ring-accent"
                />
                <Button size="sm" variant="accent" onClick={() => review(s, "approve")}>
                  {t("admin.approve")}
                </Button>
                <Button size="sm" variant="outline" onClick={() => review(s, "reject")}>
                  {t("admin.reject")}
                </Button>
              </div>
            ) : s.reviewNote ? (
              <p className="text-sm text-muted">
                {s.reviewer?.name}: {s.reviewNote}
              </p>
            ) : null}
          </article>
        );
      })}
      {list.hasNextPage ? (
        <Button variant="ghost" onClick={() => list.fetchNextPage()} loading={list.isFetchingNextPage}>
          {t("common.more")}
        </Button>
      ) : null}
    </div>
  );
}

function ReportsQueue() {
  const { t, locale } = useI18n();
  const api = useApi();
  const qc = useQueryClient();
  const [status, setStatus] = useState<"open" | "actioned" | "dismissed">("open");
  const list = useInfiniteEndpoint(endpoints.admin.reports, { query: { status, limit: 20 } });
  const items = useMemo(() => list.data?.pages.flatMap((p) => p.items as Report[]) ?? [], [list.data]);
  const resolve = async (r: Report, action: "dismiss" | "remove_content" | "ban_user") => {
    if (
      action === "ban_user" &&
      !(await confirm({ title: t("admin.banUser"), description: t("confirm.banText"), danger: true }))
    )
      return;
    await api.admin.resolveReport({ params: { id: r.id }, body: { action } });
    toast(t("admin.resolved"));
    await invalidate(qc, endpoints.admin.reports, endpoints.me.badges);
  };
  const href = (r: Report) =>
    ({
      track: `/track/${r.targetId}`,
      user: `/user/${r.targetId}`,
      thread: `/community/${r.targetId}`,
      playlist: `/playlist/${r.targetId}`,
    })[r.targetType as "track"] ?? null;
  return (
    <div className="space-y-4">
      <StatusTabs value={status} onChange={setStatus} options={["open", "actioned", "dismissed"]} />
      {!list.isLoading && !items.length ? (
        <p className="py-10 text-center text-muted">{t("common.empty")}</p>
      ) : null}
      {items.map((r) => (
        <article key={r.id} className="space-y-3 rounded-xl bg-surface-2 p-5">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-danger/20 px-2.5 py-1 text-xs font-bold text-danger">
              {t(`report.reasons.${r.reason}`)}
            </span>
            <span className="rounded-full bg-surface-3 px-2.5 py-1 text-xs font-bold">{r.targetType}</span>
            {href(r) ? (
              <Link href={href(r)!} className="font-bold hover:underline">
                {r.targetLabel ?? r.targetId}
              </Link>
            ) : (
              <span className="font-bold">{r.targetLabel ?? r.targetId}</span>
            )}
            <span className="ml-auto text-xs text-subtle">
              {r.reporter?.name} · {formatRelative(r.createdAt, t, locale)}
            </span>
          </div>
          {r.details ? <p className="text-sm text-muted">{r.details}</p> : null}
          {r.status === "open" ? (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => resolve(r, "dismiss")}>
                {t("admin.dismiss")}
              </Button>
              <Button size="sm" variant="secondary" onClick={() => resolve(r, "remove_content")}>
                {t("admin.removeContent")}
              </Button>
              <Button size="sm" variant="danger" onClick={() => resolve(r, "ban_user")}>
                {t("admin.banUser")}
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted">{r.resolution}</p>
          )}
        </article>
      ))}
    </div>
  );
}

function BugReports() {
  const { t, locale } = useI18n();
  const api = useApi();
  const qc = useQueryClient();
  const [status, setStatus] = useState<"open" | "resolved">("open");
  const list = useInfiniteEndpoint(endpoints.admin.bugReports, { query: { status, limit: 20 } });
  const items = useMemo(() => list.data?.pages.flatMap((p) => p.items as BugReport[]) ?? [], [list.data]);
  return (
    <div className="space-y-4">
      <StatusTabs value={status} onChange={setStatus} options={["open", "resolved"]} />
      {items.map((b) => (
        <article key={b.id} className="space-y-3 rounded-xl bg-surface-2 p-5">
          <div className="flex items-center gap-2 text-xs text-subtle">
            {b.user?.name ?? "—"} · {formatRelative(b.createdAt, t, locale)}
          </div>
          <p className="whitespace-pre-line">{b.description}</p>
          {b.screenshots.length ? (
            <div className="flex gap-2">
              {b.screenshots.map((s) => (
                <a key={s} href={s} target="_blank" rel="noreferrer">
                  <img src={s} alt="" className="h-28 rounded-md object-cover" />
                </a>
              ))}
            </div>
          ) : null}
          {b.context ? (
            <pre className="max-h-40 overflow-auto rounded-md bg-surface-3 p-3 text-xs">
              {JSON.stringify(b.context, null, 2)}
            </pre>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            onClick={async () => {
              await api.admin.setBugReportStatus({
                params: { id: b.id },
                body: { status: b.status === "open" ? "resolved" : "open" },
              });
              await invalidate(qc, endpoints.admin.bugReports);
            }}
          >
            {b.status === "open" ? t("admin.resolved") : t("common.back")}
          </Button>
        </article>
      ))}
    </div>
  );
}

function UsersAdmin() {
  const { t, locale } = useI18n();
  const api = useApi();
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const list = useInfiniteEndpoint(endpoints.admin.users, {
    query: { limit: 30, ...(q.trim() ? { q: q.trim() } : {}) },
  });
  const items = useMemo(
    () =>
      list.data?.pages.flatMap(
        (p) =>
          p.items as {
            id: string;
            name: string;
            email: string;
            image: string | null;
            username: string | null;
            role: string;
            banned: boolean;
            createdAt: string;
          }[],
      ) ?? [],
    [list.data],
  );
  return (
    <div className="space-y-4">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={t("common.search")}
        className="h-10 w-full max-w-sm rounded-md bg-surface-2 px-3 outline-none focus:ring-2 focus:ring-accent"
      />
      <ul className="divide-y divide-line rounded-xl bg-surface-2">
        {items.map((u) => (
          <li key={u.id} className="flex flex-wrap items-center gap-3 p-3">
            <Avatar src={u.image} name={u.name} size={36} />
            <div className="min-w-0 flex-1">
              <Link href={`/user/${u.username ?? u.id}`} className="font-semibold hover:underline">
                {u.name}
              </Link>
              <div className="truncate text-xs text-muted">
                {u.email} · {formatRelative(u.createdAt, t, locale)}
              </div>
            </div>
            <select
              value={u.role}
              onChange={async (e) => {
                await api.admin.setUser({ params: { id: u.id }, body: { role: e.target.value as "user" } });
                await invalidate(qc, endpoints.admin.users);
              }}
              className="h-9 rounded-md bg-surface-3 px-2 text-sm"
            >
              {["user", "artist", "moderator", "admin"].map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant={u.banned ? "outline" : "danger"}
              onClick={async () => {
                await api.admin.setUser({ params: { id: u.id }, body: { banned: !u.banned } });
                await invalidate(qc, endpoints.admin.users);
              }}
            >
              {u.banned ? t("common.unblock") : t("common.block")}
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Audit() {
  const { t, locale } = useI18n();
  const list = useInfiniteEndpoint(endpoints.admin.audit, { query: { limit: 50 } });
  const items = useMemo(() => list.data?.pages.flatMap((p) => p.items as AuditEntry[]) ?? [], [list.data]);
  return (
    <ul className="divide-y divide-line rounded-xl bg-surface-2 text-sm">
      {items.map((e) => (
        <li key={e.id} className="flex items-center gap-3 p-3">
          <span className="w-28 shrink-0 text-xs text-subtle">{formatRelative(e.createdAt, t, locale)}</span>
          <span className="shrink-0 font-semibold">{e.actor?.name ?? "system"}</span>
          <span className="rounded bg-surface-3 px-2 py-0.5 font-mono text-xs">{e.action}</span>
          <span className="truncate text-muted">{e.label ?? e.entityId}</span>
        </li>
      ))}
    </ul>
  );
}

function StatusTabs<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: T[];
}) {
  const { t } = useI18n();
  return (
    <div className="flex gap-2">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          onClick={() => onChange(o)}
          className={cn(
            "h-8 rounded-full px-3 text-sm font-semibold",
            value === o ? "bg-accent text-on-accent" : "bg-surface-2 hover:bg-surface-3",
          )}
        >
          {t(`admin.status.${o}` as "admin.status.open")}
        </button>
      ))}
    </div>
  );
}
