"use client";
/**
 * Батл рояль з v1: турнір пісень на вибування (4…1024) з плейлиста — свого чи спільноти — або з жанру.
 * Пари слухаємо поруч (відео YouTube або аудіо), обираємо кращу; переможець — з п'єдесталом і шляхом.
 */
import { endpoints, type Genre, type Playlist, type Track } from "@musicdb/contracts/client";
import { useEndpoint, useLibrary, useMe } from "@musicdb/sdk/react";
import { Crown, Swords, Tags } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import { Cover } from "@/components/ui/cover";
import { Dialog } from "@/components/ui/dialog";
import { PageTitle } from "@/components/ui/heading";
import { api } from "@/lib/api";
import {
  type BattleWinner,
  loadBattle,
  loadWinners,
  type SavedBattle,
  saveBattle,
} from "@/lib/battle-storage";
import { useT } from "@/lib/i18n";
import { Tournament } from "./battle-tournament";

export const BATTLE_SIZES = [4, 8, 16, 32, 64, 128, 256, 512, 1024];

type Pool = { title: string; count: number; load: (size: number) => Promise<Track[]> };

export function shuffled<T>(list: T[]): T[] {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

/** Випадкові пісні жанру — сторінками по 100 з одним зерном, доки не набереться розмір турніру. */
async function genreTracks(genre: Genre, size: number): Promise<Track[]> {
  const seed = Math.random().toString(36).slice(2, 10);
  const out: Track[] = [];
  let cursor: string | undefined;
  while (out.length < size) {
    const page = await api.tracks.browse({
      query: { genre: genre.slug, sort: "random", seed, limit: 100, ...(cursor ? { cursor } : {}) },
    });
    out.push(...page.items);
    if (!page.nextCursor) break;
    cursor = page.nextCursor;
  }
  return out.slice(0, size);
}

async function playlistTracks(id: string): Promise<Track[]> {
  const p = await api.playlists.get({ params: { id } });
  const seen = new Set<string>();
  return p.items.map((i) => i.track).filter((x) => !seen.has(x.id) && seen.add(x.id));
}

export function BattleView() {
  const t = useT();
  const me = useMe().data;
  const library = useLibrary().data;
  const genres = useEndpoint(endpoints.genres.list);
  const community = useEndpoint(endpoints.playlists.browse, { query: { minTracks: 4, limit: 48 } });
  const battleGenres = useMemo(
    () =>
      (genres.data?.items ?? [])
        .filter((g) => g.trackCount >= 4)
        .sort((a, b) => b.trackCount - a.trackCount || a.name.localeCompare(b.name)),
    [genres.data],
  );
  const [genreId, setGenreId] = useState("");
  const genre = battleGenres.find((g) => g.id === genreId) ?? battleGenres[0];
  const own = (library?.playlists ?? []).filter((p) => p.owner.id === me?.id && p.trackCount >= 4);
  const [pool, setPool] = useState<Pool | null>(null);
  const [loading, setLoading] = useState(false);
  const [game, setGame] = useState<{
    tracks: Track[];
    title: string;
    choices: (0 | 1)[];
    pool: Pool | null;
  } | null>(null);
  // Незавершений турнір і «Мої переможці» — з браузера (лише після монтування).
  const [saved, setSaved] = useState<SavedBattle | null>(null);
  const [winners, setWinners] = useState<BattleWinner[]>([]);
  useEffect(() => {
    if (game) return;
    setSaved(loadBattle());
    setWinners(loadWinners());
  }, [game]);

  const start = async (size: number) => {
    if (!pool) return;
    setLoading(true);
    try {
      const tracks = shuffled(await pool.load(size)).slice(0, size);
      if (tracks.length < size) throw new Error("not enough");
      setGame({ tracks, title: pool.title, choices: [], pool });
      setPool(null);
    } catch {
      toast.error(t("battle.notEnough"));
    } finally {
      setLoading(false);
    }
  };

  const playlistPool = (p: Playlist): Pool => ({
    title: p.title,
    count: p.trackCount,
    load: async () => playlistTracks(p.id),
  });

  return (
    <div className="pb-10">
      <PageTitle
        pre={t("battle.headingPre")}
        accent={t("battle.headingAccent")}
        sub={t("explore.battleSub")}
      />

      {saved ? (
        <section className="mx-4 mb-4 flex animate-rise flex-wrap items-center gap-4 rounded-2xl border border-accent/50 bg-accent-soft p-4 sm:mx-6">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent text-on-accent">
            <Swords className="size-6" />
          </span>
          <div className="min-w-[200px] flex-1">
            <strong className="block font-serif text-lg">{t("battle.resumeTitle")}</strong>
            <span className="text-sm text-fg-2">
              {t("battle.resumeText", {
                title: saved.title,
                x: saved.choices.length,
                n: saved.initial.length - 1,
              })}
            </span>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={async () => {
                const ok = await confirm({
                  title: t("battle.discard"),
                  description: t("battle.exitConfirm"),
                  danger: true,
                });
                if (!ok) return;
                saveBattle(null);
                setSaved(null);
              }}
            >
              {t("battle.discard")}
            </Button>
            <Button
              onClick={() =>
                setGame({ tracks: saved.initial, title: saved.title, choices: saved.choices, pool: null })
              }
            >
              {t("battle.resume")}
            </Button>
          </div>
        </section>
      ) : null}

      <section className="mx-4 flex flex-wrap items-center gap-4 rounded-lg border border-line bg-surface-2/60 p-4 sm:mx-6">
        <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
          <Tags className="size-6" />
        </span>
        <div className="min-w-[200px] flex-1">
          <strong className="block font-serif text-lg">{t("battle.genreHeading")}</strong>
          <span className="text-sm text-muted">{t("battle.genreHint")}</span>
        </div>
        {battleGenres.length ? (
          <div className="flex w-full flex-wrap gap-2 sm:w-auto">
            <select
              value={genre?.id ?? ""}
              onChange={(e) => setGenreId(e.target.value)}
              aria-label={t("battle.genreHeading")}
              className="h-10 min-w-0 flex-1 rounded-full border border-line bg-surface-2 px-3 text-sm outline-none focus:border-accent sm:w-56"
            >
              {battleGenres.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name} ({g.trackCount})
                </option>
              ))}
            </select>
            <Button
              onClick={() =>
                genre &&
                setPool({
                  title: genre.name,
                  count: genre.trackCount,
                  load: (size) => genreTracks(genre, size),
                })
              }
            >
              <Swords className="size-4" /> {t("battle.genreStart")}
            </Button>
          </div>
        ) : (
          <span className="text-sm text-muted">{t("battle.genreEmpty")}</span>
        )}
      </section>

      {winners.length ? (
        <PlaylistSection title={t("battle.winnersTitle")}>
          <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1">
            {winners.map((w) => (
              <Link
                key={`${w.id}-${w.at}`}
                href={`/track/${w.id}`}
                className="group flex w-40 shrink-0 flex-col gap-2 rounded-lg p-2 transition-colors hover:bg-surface-2"
              >
                <div className="relative">
                  <Cover src={w.cover} alt="" size={160} seed={w.id} className="lift w-full" />
                  <Crown
                    className="absolute top-2 left-2 size-5 text-[#e9c46a] drop-shadow"
                    fill="currentColor"
                  />
                </div>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{w.title}</div>
                  <div className="truncate text-xs text-muted">{w.artists}</div>
                  <div className="truncate text-[11px] text-subtle">
                    {w.pool} · {w.size}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </PlaylistSection>
      ) : null}

      <PlaylistSection title={t("battle.ownHeading")}>
        {!me ? (
          <p className="text-sm text-muted">
            <Link href="/login?next=/battle" className="text-accent hover:underline">
              {t("common.signIn")}
            </Link>{" "}
            — {t("battle.ownLogin")}
          </p>
        ) : own.length === 0 ? (
          <p className="text-sm text-muted">{t("battle.ownEmpty")}</p>
        ) : (
          <PlaylistGrid playlists={own} onPick={(p) => setPool(playlistPool(p))} />
        )}
      </PlaylistSection>

      <PlaylistSection title={t("battle.publicHeading")}>
        {community.data?.items.length ? (
          <PlaylistGrid playlists={community.data.items} onPick={(p) => setPool(playlistPool(p))} showOwner />
        ) : community.isLoading ? (
          <div className="skeleton h-40 rounded-lg" />
        ) : (
          <p className="text-sm text-muted">{t("battle.publicEmpty")}</p>
        )}
      </PlaylistSection>

      <Dialog
        open={!!pool}
        onOpenChange={(o) => !o && setPool(null)}
        title={pool?.title ?? ""}
        description={t("battle.chooseSize")}
      >
        {pool && BATTLE_SIZES.some((s) => s <= pool.count) ? (
          <div className="flex flex-wrap justify-center gap-2">
            {BATTLE_SIZES.filter((s) => s <= pool.count).map((s) => (
              <Button
                key={s}
                variant="outline"
                className="min-w-16"
                disabled={loading}
                onClick={() => start(s)}
              >
                {s}
              </Button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">{t("battle.notEnough")}</p>
        )}
        {loading ? <p className="mt-4 text-center text-sm text-muted">{t("battle.loading")}</p> : null}
      </Dialog>

      {game ? (
        <Tournament
          key={game.tracks.map((x) => x.id).join()}
          initial={game.tracks}
          title={game.title}
          initialChoices={game.choices}
          onRematch={async () => {
            const size = game.tracks.length;
            const tracks = game.pool
              ? shuffled(await game.pool.load(size)).slice(0, size)
              : shuffled(game.tracks);
            setGame({ ...game, tracks, choices: [] });
          }}
          onExit={() => setGame(null)}
        />
      ) : null}
    </div>
  );
}

function PlaylistSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="px-4 pt-8 sm:px-6">
      <h2 className="serif-title mb-3 text-2xl">{title}</h2>
      {children}
    </section>
  );
}

function PlaylistGrid({
  playlists,
  onPick,
  showOwner,
}: {
  playlists: Playlist[];
  onPick: (p: Playlist) => void;
  showOwner?: boolean;
}) {
  const t = useT();
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
      {playlists.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => onPick(p)}
          className="group rounded-lg p-2 text-left transition-colors hover:bg-surface-2"
        >
          <div className="relative">
            <Cover
              src={p.coverUrl}
              mosaic={p.mosaic}
              alt=""
              size={200}
              seed={p.id}
              className="w-full shadow-md"
            />
            <span className="accent-grad absolute right-2 bottom-2 flex size-10 translate-y-2 items-center justify-center rounded-full opacity-0 shadow-lg transition-all group-hover:translate-y-0 group-hover:opacity-100">
              <Swords className="size-5" />
            </span>
          </div>
          <div className="mt-2 truncate text-sm font-semibold">{p.title}</div>
          <div className="truncate text-xs text-muted">
            {showOwner ? `${p.owner.name} · ` : ""}
            {t("release.songs", { count: p.trackCount })}
          </div>
        </button>
      ))}
    </div>
  );
}
