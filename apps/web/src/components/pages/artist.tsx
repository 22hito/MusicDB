"use client";
import { type ArtistDetail, endpoints, type Release } from "@musicdb/contracts/client";
import { useEndpoint, useFollowArtist } from "@musicdb/sdk/react";
import { BadgeCheck, ExternalLink, Globe, Shuffle } from "lucide-react";
import { useMemo, useState } from "react";
import { ArtistCard, GenreCard, ReleaseCard, Shelf } from "@/components/music/cards";
import { PlayContextButton } from "@/components/music/common";
import { ActionBar } from "@/components/music/page-header";
import { TrackList } from "@/components/music/track-list";
import { Button, IconButton } from "@/components/ui/button";
import { Cover } from "@/components/ui/cover";
import { cn } from "@/lib/cn";
import { useDominantColor } from "@/lib/color";
import { useI18n } from "@/lib/i18n";
import { sized } from "@/lib/image";
import { useAuthGate } from "@/lib/use-auth-gate";
import { playerStore } from "@/player/store";

type Tab = "popular" | "album" | "single" | "compilation";

export function ArtistView({ id, initial }: { id: string; initial: ArtistDetail }) {
  const { t, locale } = useI18n();
  const { data = initial } = useEndpoint(
    endpoints.artists.get,
    { params: { id } },
    { initialData: initial, staleTime: 60_000 },
  );
  const follow = useFollowArtist();
  const gate = useAuthGate();
  const [showAll, setShowAll] = useState(false);
  const [tab, setTab] = useState<Tab>("popular");
  const color = useDominantColor(data.imageUrl, data.id);
  const context = { type: "artist" as const, id: data.id, name: data.name };
  const following = !!data.viewer?.following;
  const bioLang = data.bio?.[locale] ? locale : data.bio?.uk ? "uk" : data.bio?.en ? "en" : null;
  const bio = bioLang ? data.bio?.[bioLang] : undefined;
  const bioSource = bioLang ? data.bioSource?.[bioLang] : undefined;
  const country = data.country
    ? (() => {
        try {
          return new Intl.DisplayNames([locale === "uk" ? "uk" : "en"], { type: "region" }).of(data.country);
        } catch {
          return data.country;
        }
      })()
    : null;
  // Рік — лише для гуртів (рік заснування); для людини це був би рік народження — зайве.
  const isGroup = ["Group", "Orchestra", "Choir"].includes(data.artistType ?? "");
  const chips = [
    [country, isGroup && data.beginYear ? t("artist.since", { year: String(data.beginYear) }) : null]
      .filter(Boolean)
      .join(" · "),
    data.trackCount ? t("artist.trackCount", { count: data.trackCount }) : "",
    data.monthlyListeners ? t("artist.monthlyListeners", { count: data.monthlyListeners }) : "",
    data.followerCount ? t("artist.followers", { count: data.followerCount }) : "",
  ].filter(Boolean);

  const groups = useMemo(() => {
    const byType = (types: Release["type"][]) => data.releases.filter((r) => types.includes(r.type));
    return {
      popular: data.releases.slice(0, 12),
      album: byType(["album"]),
      single: byType(["single", "ep"]),
      compilation: byType(["compilation"]),
    } satisfies Record<Tab, Release[]>;
  }, [data.releases]);
  const tabs = (Object.keys(groups) as Tab[]).filter((k) => groups[k].length > 0);
  const tabLabel: Record<Tab, string> = {
    popular: t("artist.popular"),
    album: t("artist.albums"),
    single: t("artist.singles"),
    compilation: t("artist.compilations"),
  };

  return (
    <div>
      {/* «Афіша» виконавця: рамка, фото праворуч із м'яким переходом, ім'я — звичайним серифом. */}
      <div className="px-4 pt-4 sm:px-6">
        <div
          className="relative isolate flex min-h-[260px] items-end overflow-hidden rounded-2xl border border-line/60 sm:min-h-[320px]"
          style={{ background: `color-mix(in srgb, ${color} 45%, var(--n-bg))` }}
        >
          {data.imageUrl ? (
            <img
              src={sized(data.imageUrl, 1000) ?? data.imageUrl}
              alt=""
              className="absolute inset-y-0 right-0 -z-10 size-full object-cover object-[center_25%] sm:w-[70%] sm:[mask-image:linear-gradient(to_right,transparent,black_40%)]"
              fetchPriority="high"
            />
          ) : null}
          <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/10 to-transparent sm:bg-gradient-to-r sm:from-black/50 sm:via-transparent" />
          <div className="max-w-2xl p-6 sm:p-8">
            <span className="flex items-center gap-2 text-[11px] font-bold tracking-[0.18em] text-accent uppercase">
              <span className="h-px w-5 bg-accent" aria-hidden />
              {isGroup ? t("artist.group") : t("artist.person")}
              {data.verified ? (
                <BadgeCheck className="size-4 fill-info text-white" aria-label={t("artist.verified")} />
              ) : null}
            </span>
            <h1
              className="serif-title mt-2.5 text-[36px] text-white sm:text-[48px] xl:text-[56px]"
              style={{ lineHeight: 1.05 }}
            >
              {data.name}
            </h1>
            <div className="mt-4 flex flex-wrap gap-2 text-[12.5px] font-medium text-white/90">
              {chips.map((c) => (
                <span
                  key={c}
                  className="rounded-full border border-white/15 bg-black/25 px-3 py-1 backdrop-blur"
                >
                  {c}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="relative">
        <ActionBar>
          <PlayContextButton tracks={data.topTracks} context={context} />
          <IconButton
            label={t("common.shuffle")}
            size="lg"
            onClick={() => playerStore.getState().playContext(data.topTracks, 0, context, { shuffle: true })}
          >
            <Shuffle className="size-7" />
          </IconButton>
          <span>
            <Button
              variant="outline"
              size="sm"
              onClick={gate(() => follow.mutate({ artistId: data.id, follow: !following }))}
            >
              {following ? t("common.following") : t("common.follow")}
            </Button>
          </span>
        </ActionBar>
        {data.links.length ? (
          <nav aria-label={t("artist.links")} className="-mt-1 flex flex-wrap gap-2 px-4 pb-4 sm:px-6">
            {data.links.map((l) => (
              <a
                key={l.kind}
                href={l.url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex h-8 items-center gap-1.5 rounded-full border border-line px-3 text-[12.5px] font-semibold text-muted transition-colors hover:border-accent/50 hover:text-fg"
              >
                {l.kind === "website" ? <Globe className="size-3.5" /> : null}
                {t(`artist.link.${l.kind}` as "artist.link.website")}
                <ExternalLink className="size-3 opacity-60" />
              </a>
            ))}
          </nav>
        ) : null}

        <div className="space-y-10 px-4 sm:px-6">
          {data.topTracks.length ? (
            <section>
              <h2 className="mb-3 serif-title text-[24px]">{t("artist.popular")}</h2>
              <div className="-mx-4">
                <TrackList
                  items={(showAll ? data.topTracks : data.topTracks.slice(0, 5)).map((track) => ({ track }))}
                  context={context}
                  showAlbum={false}
                  showArtists={false}
                  showPlays
                  header={false}
                />
              </div>
              {data.topTracks.length > 5 ? (
                <button
                  type="button"
                  onClick={() => setShowAll(!showAll)}
                  className="mt-3 ml-0 text-sm font-bold text-muted hover:text-fg"
                >
                  {showAll ? t("common.showLess") : t("common.more")}
                </button>
              ) : null}
            </section>
          ) : null}

          {tabs.length ? (
            <section>
              <h2 className="mb-3 serif-title text-[24px]">{t("artist.discography")}</h2>
              <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto">
                {tabs.map((k) => (
                  <button
                    key={k}
                    type="button"
                    onClick={() => setTab(k)}
                    className={cn(
                      "h-8 shrink-0 rounded-full px-3 text-[13px] font-semibold transition-colors",
                      tab === k ? "bg-accent text-on-accent" : "bg-surface-2 hover:bg-surface-3",
                    )}
                  >
                    {tabLabel[k]}
                  </button>
                ))}
              </div>
              <Shelf title="">
                {groups[tab].map((r) => (
                  <div key={r.id} className="snap-start">
                    <ReleaseCard release={r} />
                  </div>
                ))}
              </Shelf>
            </section>
          ) : null}

          {data.genres.length ? (
            <section>
              <div className="flex flex-wrap gap-2">
                {data.genres.map((g) => (
                  <GenreCard
                    key={g.id}
                    genre={g}
                    className="aspect-auto px-4 py-2 text-sm [&>span:first-child]:text-sm"
                  />
                ))}
              </div>
            </section>
          ) : null}

          {data.appearsOn.length ? (
            <Shelf title={t("artist.appearsOn")}>
              {data.appearsOn.map((r) => (
                <div key={r.id} className="snap-start">
                  <ReleaseCard release={r} />
                </div>
              ))}
            </Shelf>
          ) : null}

          {data.related.length ? (
            <Shelf title={t("artist.fansAlsoLike")}>
              {data.related.map((a) => (
                <div key={a.id} className="snap-start">
                  <ArtistCard artist={a} />
                </div>
              ))}
            </Shelf>
          ) : null}

          {bio ? (
            <section>
              <h2 className="mb-3 serif-title text-[24px]">{t("artist.about")}</h2>
              <div className="relative max-w-3xl overflow-hidden rounded-xl bg-surface-2">
                {data.imageUrl ? (
                  <Cover
                    src={data.imageUrl}
                    alt=""
                    size={1000}
                    seed={data.id}
                    rounded="none"
                    className="aspect-[16/9] w-full"
                  />
                ) : null}
                <div className="p-6">
                  <p className="mb-3 font-bold">
                    {t("artist.monthlyListeners", { count: data.monthlyListeners })}
                  </p>
                  <p className="text-[15px] leading-relaxed whitespace-pre-line text-muted">{bio}</p>
                  {bioSource ? (
                    <a
                      href={bioSource}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="mt-3 inline-flex items-center gap-1 text-xs text-subtle hover:text-fg"
                    >
                      {t("artist.bioSource")} · CC BY-SA 4.0 <ExternalLink className="size-3" />
                    </a>
                  ) : null}
                </div>
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
