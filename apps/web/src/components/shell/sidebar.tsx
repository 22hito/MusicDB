"use client";
import { useLibrary, useMe, usePlaylistActions } from "@musicdb/sdk/react";
import { Heart, PanelLeftClose, PanelLeftOpen, Pin, Plus, Search, Volume2 } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button, IconButton } from "@/components/ui/button";
import { Cover } from "@/components/ui/cover";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n";
import { mainNav } from "@/lib/nav";
import { useUi } from "@/lib/ui-store";
import { usePlayer } from "@/player/store";
import { Logo } from "./logo";

type Filter = "all" | "playlists" | "artists" | "albums";

type Entry = {
  key: string;
  href: string;
  title: string;
  subtitle: string;
  image: string | null;
  mosaic?: string[];
  round?: boolean;
  context: { type: string; id: string };
  kind: Exclude<Filter, "all">;
};

export function Sidebar() {
  const t = useT();
  const me = useMe().data;
  const library = useLibrary().data;
  const collapsed = useUi((s) => s.sidebarCollapsed);
  const toggle = useUi((s) => s.toggleSidebar);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const actions = usePlaylistActions();
  const playing = usePlayer((s) => (s.status === "playing" ? s.context : null));

  const entries = useMemo<Entry[]>(() => {
    if (!library) return [];
    const list: Entry[] = [
      ...library.playlists.map((p) => ({
        key: `p-${p.id}`,
        href: `/playlist/${p.id}`,
        title: p.title,
        subtitle: t("library.playlistBy", { name: p.owner.name }),
        image: p.coverUrl,
        mosaic: p.mosaic,
        context: { type: "playlist", id: p.id },
        kind: "playlists" as const,
      })),
      ...library.artists.map((a) => ({
        key: `a-${a.id}`,
        href: `/artist/${a.slug}`,
        title: a.name,
        subtitle: t("library.artist"),
        image: a.imageUrl,
        round: true,
        context: { type: "artist", id: a.id },
        kind: "artists" as const,
      })),
      ...library.releases.map((r) => ({
        key: `r-${r.id}`,
        href: `/album/${r.id}`,
        title: r.title,
        subtitle: `${t(`release.${r.type}`)} · ${r.artists.map((x) => x.name).join(", ")}`,
        image: r.coverUrl,
        context: { type: "album", id: r.id },
        kind: "albums" as const,
      })),
    ];
    const q = query.trim().toLowerCase();
    return list.filter(
      (e) => (filter === "all" || e.kind === filter) && (!q || e.title.toLowerCase().includes(q)),
    );
  }, [library, filter, query, t]);

  const createPlaylist = () => {
    if (!me) {
      router.push("/login");
      return;
    }
    const n = (library?.playlists.filter((p) => p.owner.id === me.id).length ?? 0) + 1;
    actions.create.mutate(
      { title: t("playlist.newTitle", { n }), visibility: "private", trackIds: [] },
      {
        onSuccess: (p) => {
          toast(t("playlist.created"));
          router.push(`/playlist/${p.id}`);
        },
      },
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Логотип і згортання панелі */}
      <div className={cn("flex h-16 shrink-0 items-center gap-2 px-5", collapsed && "justify-center px-0")}>
        <Link href="/" aria-label="N'Owl" className="min-w-0">
          <Logo className="h-8" withText={!collapsed} />
        </Link>
        {!collapsed ? (
          <IconButton
            label={t("nav.collapse")}
            size="sm"
            onClick={toggle}
            className="ml-auto text-subtle hover:text-fg"
          >
            <PanelLeftClose className="size-[18px]" />
          </IconButton>
        ) : null}
      </div>
      {collapsed ? (
        <IconButton
          label={t("nav.expand")}
          size="sm"
          onClick={toggle}
          className="mx-auto mb-2 text-subtle hover:text-fg"
        >
          <PanelLeftOpen className="size-[18px]" />
        </IconButton>
      ) : null}

      <nav className="shrink-0 px-3" aria-label="N'Owl">
        <ul className="space-y-0.5">
          {mainNav(t).map((item) => {
            const active = item.match(pathname);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={collapsed ? item.label : undefined}
                  className={cn(
                    "relative flex h-10 items-center gap-3.5 rounded-lg px-3 text-[14.5px] font-medium transition-colors",
                    active ? "bg-accent-soft text-fg" : "text-muted hover:bg-surface-2/70 hover:text-fg",
                    collapsed && "justify-center px-0",
                  )}
                >
                  {active ? (
                    <span
                      className="absolute top-2 bottom-2 left-0 w-[3px] rounded-full bg-accent"
                      aria-hidden
                    />
                  ) : null}
                  <item.icon
                    className={cn("size-[19px] shrink-0 transition-colors", active && "text-accent")}
                    strokeWidth={active ? 2.3 : 1.9}
                  />
                  {!collapsed ? <span className="truncate">{item.label}</span> : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <aside
        className="mt-4 flex min-h-0 flex-1 flex-col border-t border-line/70 pt-3"
        aria-label={t("library.title")}
      >
        <div className={cn("flex items-center gap-2 px-5 pb-1", collapsed && "justify-center px-0")}>
          {!collapsed ? (
            <span className="flex-1 text-[11px] font-bold tracking-[0.12em] text-subtle uppercase">
              {t("library.title")}
            </span>
          ) : null}
          <IconButton
            label={t("nav.createPlaylist")}
            onClick={createPlaylist}
            size="sm"
            className="text-muted hover:text-accent"
          >
            <Plus className="size-[18px]" />
          </IconButton>
        </div>

        {!collapsed && me ? (
          <div className="flex gap-3 px-5 pb-1.5 text-[12.5px]" role="tablist">
            {(["all", "playlists", "artists", "albums"] as const).map((f) => (
              <button
                key={f}
                type="button"
                role="tab"
                aria-selected={filter === f}
                onClick={() => setFilter(f)}
                className={cn(
                  "relative pb-1 font-semibold transition-colors",
                  filter === f ? "text-fg" : "text-subtle hover:text-fg",
                )}
              >
                {f === "all" ? t("search.all") : t(`library.${f}`)}
                {filter === f ? (
                  <span
                    className="absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-accent"
                    aria-hidden
                  />
                ) : null}
              </button>
            ))}
          </div>
        ) : null}

        <div className="scroll-area min-h-0 flex-1 overflow-y-auto px-2 pb-2">
          {!me ? (
            collapsed ? null : (
              <div className="m-2 rounded-lg bg-surface-2 p-5">
                <p className="font-bold">{t("library.emptyTitle")}</p>
                <p className="mt-1 mb-5 text-sm text-muted">{t("library.emptyText")}</p>
                <Button size="sm" onClick={() => router.push("/login")}>
                  {t("common.signIn")}
                </Button>
              </div>
            )
          ) : (
            <>
              {!collapsed ? (
                <div className="flex items-center justify-between px-2 py-1">
                  {searching ? (
                    <input
                      ref={(el) => el?.focus()}
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      onBlur={() => !query && setSearching(false)}
                      placeholder={t("library.filter")}
                      className="h-8 w-full rounded-sm bg-surface-3 px-3 text-[13px] outline-none"
                    />
                  ) : (
                    <IconButton label={t("library.filter")} size="sm" onClick={() => setSearching(true)}>
                      <Search className="size-4" />
                    </IconButton>
                  )}
                </div>
              ) : null}
              <ul className="space-y-0.5">
                {(filter === "all" || filter === "playlists") && !query ? (
                  <li>
                    <SidebarRow
                      href="/collection/tracks"
                      active={pathname === "/collection/tracks"}
                      collapsed={collapsed}
                      title={t("nav.likedSongs")}
                      subtitle={
                        <>
                          <Pin className="inline size-3.5 fill-accent text-accent" />{" "}
                          {t("library.likedCount", { count: library?.likedCount ?? 0 })}
                        </>
                      }
                      playing={playing?.type === "liked"}
                      cover={
                        <div className="accent-grad flex aspect-square w-full items-center justify-center rounded-md">
                          <Heart className="size-[42%]" fill="currentColor" />
                        </div>
                      }
                    />
                  </li>
                ) : null}
                {entries.map((e) => (
                  <li key={e.key}>
                    <SidebarRow
                      href={e.href}
                      active={pathname === e.href}
                      collapsed={collapsed}
                      title={e.title}
                      subtitle={e.subtitle}
                      playing={playing?.type === e.context.type && playing?.id === e.context.id}
                      cover={
                        <Cover
                          src={e.image}
                          {...(e.mosaic ? { mosaic: e.mosaic } : {})}
                          alt=""
                          size={48}
                          seed={e.context.id}
                          rounded={e.round ? "full" : "md"}
                          className="w-full"
                        />
                      }
                    />
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}

function SidebarRow({
  href,
  title,
  subtitle,
  cover,
  active,
  collapsed,
  playing,
}: {
  href: string;
  title: string;
  subtitle: React.ReactNode;
  cover: React.ReactNode;
  active: boolean;
  collapsed: boolean;
  playing: boolean;
}) {
  return (
    <Link
      href={href}
      title={collapsed ? title : undefined}
      className={cn(
        "group flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-surface-2/70",
        active && "bg-surface-2 hover:bg-surface-3",
        collapsed && "justify-center",
      )}
    >
      <div className="w-10 shrink-0">{cover}</div>
      {!collapsed ? (
        <div className="min-w-0 flex-1">
          <div className={cn("truncate text-[14px] font-medium", playing && "text-accent")}>{title}</div>
          <div className="truncate text-[12.5px] text-muted">{subtitle}</div>
        </div>
      ) : null}
      {!collapsed && playing ? <Volume2 className="size-4 shrink-0 text-accent" /> : null}
    </Link>
  );
}
