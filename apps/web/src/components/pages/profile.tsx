"use client";
import { endpoints, type Profile } from "@musicdb/contracts/client";
import { useApi, useEndpoint, useFollowUser, useMe } from "@musicdb/sdk/react";
import { Flag, Lock, MessageCircle, MoreHorizontal, Pencil, ShieldBan } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ArtistCard, PlaylistCard, Shelf } from "@/components/music/cards";
import { Dot } from "@/components/music/page-header";
import { PlayCommonButton } from "@/components/music/play-common";
import { TrackList } from "@/components/music/track-list";
import { useReportDialog } from "@/components/report-dialog";
import { Button, IconButton } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import { Avatar } from "@/components/ui/cover";
import { DropdownMenu } from "@/components/ui/menu";
import { useDominantColor } from "@/lib/color";
import { useT } from "@/lib/i18n";
import { useAuthGate } from "@/lib/use-auth-gate";

export function ProfileView({ id, initial }: { id: string; initial: Profile }) {
  const t = useT();
  const router = useRouter();
  const api = useApi();
  const me = useMe().data;
  const { data = initial, refetch } = useEndpoint(
    endpoints.users.get,
    { params: { id } },
    { initialData: initial },
  );
  const follow = useFollowUser();
  const gate = useAuthGate();
  const report = useReportDialog();
  const color = useDominantColor(data.image, data.id);
  const viewer = data.viewer;

  const message = gate(async () => {
    const conv = await api.conversations.open({ body: { userId: data.id } });
    router.push(`/messages/${conv.id}`);
  });

  const toggleBlock = async () => {
    if (
      !viewer?.blocked &&
      !(await confirm({
        title: t("confirm.blockTitle", { name: data.name }),
        description: t("confirm.blockText"),
        confirmLabel: t("common.block"),
        danger: true,
      }))
    )
      return;
    if (viewer?.blocked) await api.users.unblock({ params: { id: data.id } });
    else await api.users.block({ params: { id: data.id } });
    await refetch();
    toast(viewer?.blocked ? t("common.unblock") : t("common.block"));
  };

  return (
    <div>
      <div className="relative">
        <div
          className="pointer-events-none absolute inset-x-0 -top-16 h-[calc(100%+200px)]"
          style={{
            background: `linear-gradient(180deg, ${color}, color-mix(in srgb, ${color} 30%, transparent) 60%, transparent)`,
          }}
        />
        <header className="relative flex flex-col items-center gap-6 px-4 pt-8 pb-6 sm:flex-row sm:items-end sm:px-6 sm:pt-12">
          <Avatar
            src={data.image}
            name={data.name}
            size={200}
            className="shadow-[0_8px_40px_rgba(0,0,0,0.55)] max-sm:!size-40"
          />
          <div className="flex flex-col items-center gap-2 text-center sm:items-start sm:text-left">
            <span className="text-[13px] font-semibold">{t("nav.profile")}</span>
            <h1
              className="text-5xl font-serif font-bold tracking-[-0.01em] text-white sm:text-7xl xl:text-8xl"
              style={{ lineHeight: 1 }}
            >
              {data.name}
            </h1>
            <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5 text-sm sm:justify-start">
              {data.username ? <span className="text-fg/80">@{data.username}</span> : null}
              {data.username ? <Dot /> : null}
              <Link href={`/user/${id}/followers`} className="hover:underline">
                {data.followerCount} {t("profile.followers").toLowerCase()}
              </Link>
              <Dot />
              <Link href={`/user/${id}/following`} className="hover:underline">
                {data.followingCount} {t("profile.following").toLowerCase()}
              </Link>
              {viewer?.tasteMatch != null ? (
                <>
                  <Dot />
                  <span className="font-bold text-accent">
                    {t("profile.tasteMatch", { value: viewer.tasteMatch })}
                  </span>
                </>
              ) : null}
            </div>
            {data.bio ? <p className="mt-2 max-w-xl text-sm text-fg/80">{data.bio}</p> : null}
          </div>
        </header>
      </div>

      <div className="relative space-y-10 px-4 pt-2 pb-10 sm:px-6">
        <div className="flex items-center gap-3">
          {viewer?.isSelf ? (
            <Button variant="outline" size="sm" onClick={() => router.push("/settings")}>
              <Pencil className="size-4" /> {t("profile.editProfile")}
            </Button>
          ) : (
            <>
              <Button
                variant={viewer?.following ? "outline" : "primary"}
                size="sm"
                disabled={viewer?.blocked}
                onClick={gate(() => follow.mutate({ userId: data.id, follow: !viewer?.following }))}
              >
                {viewer?.following ? t("common.following") : t("common.follow")}
              </Button>
              {me ? (
                <Button variant="outline" size="sm" onClick={message} disabled={viewer?.blocked}>
                  <MessageCircle className="size-4" /> {t("profile.message")}
                </Button>
              ) : null}
              {me && !viewer?.blocked ? <PlayCommonButton userId={data.id} name={data.name} /> : null}
              {viewer?.followsYou ? (
                <span className="rounded-full bg-surface-2 px-3 py-1 text-xs font-semibold">
                  {t("profile.followsYou")}
                </span>
              ) : null}
              {me ? (
                <DropdownMenu
                  align="start"
                  items={[
                    {
                      label: viewer?.blocked ? t("common.unblock") : t("common.block"),
                      icon: <ShieldBan />,
                      onSelect: toggleBlock,
                    },
                    {
                      label: t("common.report"),
                      icon: <Flag />,
                      onSelect: () => report.open({ targetType: "user", targetId: data.id }),
                    },
                  ]}
                  trigger={
                    <IconButton label={t("common.more")}>
                      <MoreHorizontal className="size-6" />
                    </IconButton>
                  }
                />
              ) : null}
            </>
          )}
        </div>

        {viewer?.blocked ? <p className="text-muted">{t("profile.blocked")}</p> : null}
        {data.isPrivate && !viewer?.isSelf && !data.recentlyPlayed.length ? (
          <p className="flex items-center gap-2 text-muted">
            <Lock className="size-4" /> {t("profile.privateProfile")}
          </p>
        ) : null}

        {data.topArtists.length ? (
          <Shelf title={t("profile.topArtists")}>
            {data.topArtists.map((a) => (
              <div key={a.id} className="snap-start">
                <ArtistCard artist={a} />
              </div>
            ))}
          </Shelf>
        ) : null}

        {data.recentlyPlayed.length ? (
          <section>
            <h2 className="mb-3 serif-title text-[24px]">{t("profile.recentlyPlayed")}</h2>
            <div className="-mx-4">
              <TrackList
                items={data.recentlyPlayed.slice(0, 5).map((track) => ({ track }))}
                context={{ type: "profile", id: data.id, name: data.name }}
                header={false}
              />
            </div>
          </section>
        ) : null}

        {data.publicPlaylists.length ? (
          <Shelf title={t("profile.publicPlaylists")}>
            {data.publicPlaylists.map((p) => (
              <div key={p.id} className="snap-start">
                <PlaylistCard playlist={p} />
              </div>
            ))}
          </Shelf>
        ) : null}
      </div>
    </div>
  );
}
