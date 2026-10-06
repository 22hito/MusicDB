"use client";
/** «Схожий смак» з v1: ваш смак, карта людей (ближче — схожіший смак) і список зі спільним. */
import { endpoints, type Taste, type TasteMatch } from "@musicdb/contracts/client";
import { useEndpoint, useMe } from "@musicdb/sdk/react";
import { placeholderGradient } from "@musicdb/tokens";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { PlayCommonButton, tasteTier } from "@/components/music/play-common";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/cover";
import { PageTitle, Segmented } from "@/components/ui/heading";
import { useT } from "@/lib/i18n";

type Filter = "all" | "friends" | "others";

const userHref = (u: { id: string; username: string | null }) => `/user/${u.username ?? u.id}`;

export function TasteView() {
  const t = useT();
  const me = useMe().data;
  const { data, isLoading } = useEndpoint(endpoints.discover.taste, undefined, { enabled: !!me });
  const taste = data as Taste | undefined;
  const [filter, setFilter] = useState<Filter>("all");
  const people = useMemo(
    () =>
      (taste?.items ?? []).filter((p) =>
        filter === "all" ? true : filter === "friends" ? p.friend : !p.friend,
      ),
    [taste, filter],
  );

  return (
    <div className="pb-10">
      <PageTitle pre={t("taste.headingPre")} accent={t("taste.headingAccent")} sub={t("taste.sub")} />
      {!me ? (
        <div className="px-6 py-16 text-center">
          <p className="mb-4 text-muted">{t("taste.loginHint")}</p>
          <Button asChild>
            <Link href="/login?next=/taste">{t("common.signIn")}</Link>
          </Button>
        </div>
      ) : isLoading || !taste ? (
        <div className="mx-4 h-72 animate-pulse rounded-xl bg-surface-2/60 sm:mx-6" />
      ) : (
        <div className="space-y-6 px-4 sm:px-6">
          <section className="rounded-lg border border-line bg-surface-2/60 p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <h2 className="serif-title text-xl">{t("taste.meTitle")}</h2>
              <span className="text-sm text-muted">
                {t("taste.meStats", { liked: taste.me.likedCount, count: taste.me.trackCount })}
              </span>
            </div>
            {taste.me.topArtists.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {taste.me.topArtists.map((a) => (
                  <Link
                    key={a.id}
                    href={`/artist/${a.slug}`}
                    className="inline-flex items-center gap-2 rounded-full border border-line bg-surface-1/70 py-1 pr-3 pl-1 text-sm hover:border-accent"
                  >
                    <Avatar src={a.imageUrl} name={a.name} size={26} />
                    {a.name}
                  </Link>
                ))}
              </div>
            ) : null}
            {taste.me.topGenres.length ? (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {taste.me.topGenres.map((g) => (
                  <Link
                    key={g.id}
                    href={`/genre/${g.slug}`}
                    className="rounded-full bg-accent-soft px-2.5 py-1 text-xs font-semibold text-accent transition-colors hover:bg-accent hover:text-on-accent"
                  >
                    {g.name}
                  </Link>
                ))}
              </div>
            ) : null}
          </section>

          {taste.me.trackCount === 0 ? (
            <p className="rounded-lg border border-dashed border-line px-4 py-10 text-center text-muted">
              {t("taste.noData")}
            </p>
          ) : taste.items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-line px-4 py-10 text-center text-muted">
              {t("taste.noMatches")}
            </p>
          ) : (
            <>
              <Segmented
                value={filter}
                onChange={setFilter}
                options={[
                  { value: "all", label: t("taste.filterAll") },
                  { value: "friends", label: t("taste.filterFriends") },
                  { value: "others", label: t("taste.filterOthers") },
                ]}
              />
              <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <section className="rounded-lg border border-line bg-surface-1/60 p-3">
                  <h3 className="serif-title px-1 text-lg">{t("taste.map")}</h3>
                  <TasteMap people={people} me={me} />
                  <p className="px-1 text-xs text-muted">{t("taste.mapHint")}</p>
                </section>
                <ul className="space-y-2">
                  {people.length === 0 ? (
                    <li className="py-10 text-center text-muted">{t("taste.filterEmpty")}</li>
                  ) : null}
                  {people.map((p) => (
                    <PersonCard key={p.user.id} person={p} />
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function PersonCard({ person }: { person: TasteMatch }) {
  const t = useT();
  return (
    <li className="flex items-center gap-3 rounded-lg border border-line bg-surface-2/60 p-3 transition-colors hover:border-accent/40">
      <Link href={userHref(person.user)} className="shrink-0">
        <Avatar src={person.user.image} name={person.user.name} size={52} />
      </Link>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link href={userHref(person.user)} className="truncate font-semibold hover:underline">
            {person.user.name}
          </Link>
          {person.friend ? (
            <span className="rounded-full bg-success/15 px-2 py-0.5 text-[11px] font-semibold text-success">
              {t("taste.friend")}
            </span>
          ) : null}
        </div>
        <div className={`text-xs font-semibold ${tasteTier(person.match, t).tone}`}>
          {tasteTier(person.match, t).label}
        </div>
        {person.sharedArtists.length ? (
          <div className="mt-0.5 truncate text-[13px] text-muted">
            {t("taste.shared")} {person.sharedArtists.map((a) => a.name).join(", ")}
          </div>
        ) : null}
        {person.sharedFavorites ? (
          <div className="text-xs text-subtle">
            {t("taste.sharedFavorites", { count: person.sharedFavorites })}
          </div>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <PlayCommonButton userId={person.user.id} name={person.user.name} iconOnly />
        <div className="stat-num text-2xl leading-none">{person.match}%</div>
      </div>
    </li>
  );
}

/** Карта: ви в центрі, ближче — схожіший смак (кола 75/50/25%), зелений обідок — друзі. */
function TasteMap({ people, me }: { people: TasteMatch[]; me: { name: string; image: string | null } }) {
  const t = useT();
  const router = useRouter();
  const C = 200;
  const R = 175;
  const radius = (match: number) => 40 + (1 - match / 100) * (R - 40);
  return (
    <svg
      viewBox="0 0 400 400"
      className="mx-auto my-2 block w-full max-w-[520px]"
      role="img"
      aria-label={t("taste.map")}
    >
      <defs>
        <clipPath id="taste-clip">
          <circle r="15" />
        </clipPath>
        <clipPath id="taste-clip-me">
          <circle r="24" />
        </clipPath>
      </defs>
      {[75, 50, 25].map((p) => (
        <g key={p}>
          <circle
            cx={C}
            cy={C}
            r={radius(p)}
            fill="none"
            stroke="var(--n-border-strong)"
            strokeDasharray="3 5"
          />
          <text x={C + 4} y={C - radius(p) - 4} fontSize="10" fill="var(--n-text-subtle)">
            {p}%
          </text>
        </g>
      ))}
      {people.map((p, i) => {
        const ang = -Math.PI / 2 + ((i + 0.5) / Math.max(1, people.length)) * Math.PI * 2;
        const r = radius(p.match);
        const x = C + Math.cos(ang) * r;
        const y = C + Math.sin(ang) * r;
        const [a] = placeholderGradient(p.user.id);
        return (
          <g
            key={p.user.id}
            transform={`translate(${x} ${y})`}
            className="cursor-pointer"
            role="button"
            tabIndex={0}
            onClick={() => router.push(userHref(p.user))}
            onKeyDown={(e) => e.key === "Enter" && router.push(userHref(p.user))}
          >
            <title>{`${p.user.name} · ${p.match}%`}</title>
            <line
              x1={0}
              y1={0}
              x2={C - x}
              y2={C - y}
              stroke="var(--n-accent)"
              strokeOpacity={0.12 + p.match / 400}
            />
            <circle
              r="17"
              fill="var(--n-surface-1)"
              stroke={p.friend ? "var(--n-success)" : "var(--n-border-strong)"}
              strokeWidth="2"
            />
            {p.user.image ? (
              <image
                href={p.user.image}
                x={-15}
                y={-15}
                width={30}
                height={30}
                clipPath="url(#taste-clip)"
                preserveAspectRatio="xMidYMid slice"
              />
            ) : (
              <>
                <circle r="15" fill={a} />
                <text
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize="12"
                  fontWeight="700"
                  fill="#fff"
                >
                  {p.user.name.slice(0, 1).toUpperCase()}
                </text>
              </>
            )}
          </g>
        );
      })}
      <g transform={`translate(${C} ${C})`}>
        <circle r="27" fill="var(--n-surface-1)" stroke="var(--n-accent)" strokeWidth="3" />
        {me.image ? (
          <image
            href={me.image}
            x={-24}
            y={-24}
            width={48}
            height={48}
            clipPath="url(#taste-clip-me)"
            preserveAspectRatio="xMidYMid slice"
          />
        ) : (
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontSize="14"
            fontWeight="700"
            fill="var(--n-accent)"
          >
            {t("taste.you")}
          </text>
        )}
      </g>
    </svg>
  );
}
