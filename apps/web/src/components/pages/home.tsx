"use client";
import { endpoints, type Shelf } from "@musicdb/contracts/client";
import { useEndpoint, useLibrary, useMe } from "@musicdb/sdk/react";
import { Heart } from "lucide-react";
import Link from "next/link";
import { useMemo } from "react";
import { QuickTile, ShelfView } from "@/components/music/cards";
import { Button } from "@/components/ui/button";
import { Cover } from "@/components/ui/cover";
import { HlText } from "@/components/ui/heading";
import { api } from "@/lib/api";
import { useDominantColor } from "@/lib/color";
import { useT } from "@/lib/i18n";
import { playerStore } from "@/player/store";

function greetingKey() {
  const h = new Date().getHours();
  if (h < 5) return "home.goodNight" as const;
  if (h < 12) return "home.goodMorning" as const;
  if (h < 18) return "home.goodAfternoon" as const;
  return "home.goodEvening" as const;
}

export function HomeView() {
  const t = useT();
  const me = useMe();
  const library = useLibrary().data;
  const { data, isLoading, error, refetch } = useEndpoint(endpoints.discover.home, undefined, {
    staleTime: 60_000,
  });

  const quick = useMemo(() => {
    const tiles: {
      key: string;
      href: string;
      title: string;
      image: string | null;
      mosaic?: string[];
      seed: string;
      play?: () => void;
    }[] = [];
    if (library) {
      for (const p of library.playlists.slice(0, 5)) {
        tiles.push({
          key: p.id,
          href: `/playlist/${p.id}`,
          title: p.title,
          image: p.coverUrl,
          mosaic: p.mosaic,
          seed: p.id,
          play: async () => {
            const d = await api.playlists.get({ params: { id: p.id } });
            playerStore.getState().playContext(
              d.items.map((i) => i.track),
              0,
              { type: "playlist", id: p.id, name: p.title },
            );
          },
        });
      }
      for (const r of library.releases.slice(0, 2)) {
        tiles.push({ key: r.id, href: `/album/${r.id}`, title: r.title, image: r.coverUrl, seed: r.id });
      }
    }
    return tiles.slice(0, 7);
  }, [library]);

  const firstCover = useMemo(() => {
    const shelf = data?.shelves.find((s): s is Extract<Shelf, { kind: "tracks" }> => s.kind === "tracks");
    return shelf?.items[0]?.release?.coverUrl ?? null;
  }, [data]);
  const color = useDominantColor(firstCover, "home");

  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute inset-x-0 -top-16 h-80 opacity-60 transition-[background] duration-1000"
        style={{
          background: `linear-gradient(180deg, color-mix(in srgb, ${color} 70%, transparent), transparent)`,
        }}
        aria-hidden
      />
      <div className="relative space-y-8 px-4 pt-4 sm:px-6">
        {!me.isLoading && !me.data ? (
          <Welcome />
        ) : (
          <h1 className="serif-title text-2xl sm:text-[32px]">
            <HlText text={t(greetingKey())} />
          </h1>
        )}

        {me.data ? (
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
            <QuickTile
              href="/collection/tracks"
              title={t("nav.likedSongs")}
              cover={
                <div className="accent-grad flex size-full items-center justify-center">
                  <Heart className="size-4" fill="currentColor" />
                </div>
              }
            />
            {quick.map((q) => (
              <QuickTile
                key={q.key}
                href={q.href}
                title={q.title}
                {...(q.play ? { onPlay: q.play } : {})}
                cover={
                  <Cover
                    src={q.image}
                    {...(q.mosaic ? { mosaic: q.mosaic } : {})}
                    alt=""
                    size={64}
                    seed={q.seed}
                    rounded="none"
                    className="size-full"
                  />
                }
              />
            ))}
          </div>
        ) : null}

        {isLoading ? <HomeSkeleton /> : null}
        {error ? (
          <div className="py-16 text-center">
            <p className="mb-4 text-muted">{t("common.error")}</p>
            <Button variant="outline" onClick={() => refetch()}>
              {t("common.retry")}
            </Button>
          </div>
        ) : null}
        {data?.shelves.map((shelf) => (
          <ShelfView key={shelf.id} shelf={shelf} />
        ))}
      </div>
    </div>
  );
}

function Welcome() {
  const t = useT();
  return (
    <section className="relative overflow-hidden rounded-xl bg-gradient-to-br from-accent/30 via-surface-2 to-surface-1 p-6 sm:p-10">
      <div className="max-w-xl">
        <h1 className="serif-title text-3xl text-balance sm:text-5xl">
          <HlText text={t("home.welcomeTitle")} />
        </h1>
        <p className="mt-3 text-[15px] text-muted sm:text-lg">{t("home.welcomeText")}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button variant="accent" size="lg" asChild>
            <Link href="/signup">{t("common.signUp")}</Link>
          </Button>
          <Button variant="outline" size="lg" asChild>
            <Link href="/login">{t("common.signIn")}</Link>
          </Button>
        </div>
      </div>
      <div className="pointer-events-none absolute -right-10 -bottom-16 hidden size-72 rounded-full bg-accent/20 blur-3xl sm:block" />
    </section>
  );
}

function HomeSkeleton() {
  return (
    <div className="space-y-10">
      {[0, 1, 2].map((i) => (
        <div key={i}>
          <div className="skeleton mb-4 h-7 w-56 rounded-md" />
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-6">
            {[0, 1, 2, 3, 4, 5].map((j) => (
              <div key={j} className={j > 1 ? "hidden sm:block" : ""}>
                <div className="skeleton aspect-square rounded-md" />
                <div className="skeleton mt-3 h-4 w-3/4 rounded" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
