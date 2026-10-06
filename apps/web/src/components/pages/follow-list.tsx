"use client";
import { endpoints, type UserCard } from "@musicdb/contracts/client";
import { useFollowUser, useInfiniteEndpoint, useMe } from "@musicdb/sdk/react";
import Link from "next/link";
import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/ui/cover";
import { useT } from "@/lib/i18n";

export function FollowList({ id, kind }: { id: string; kind: "followers" | "following" }) {
  const t = useT();
  const me = useMe().data;
  const follow = useFollowUser();
  const list = useInfiniteEndpoint(
    kind === "followers" ? endpoints.users.followers : endpoints.users.following,
    {
      params: { id },
      query: { limit: 50 },
    },
  );
  const items = useMemo(() => list.data?.pages.flatMap((p) => p.items as UserCard[]) ?? [], [list.data]);
  return (
    <div className="mx-auto max-w-3xl space-y-4 px-4 pt-4 sm:px-6">
      <h1 className="serif-title text-3xl">
        {kind === "followers" ? t("profile.followers") : t("profile.following")}
      </h1>
      <ul className="space-y-1">
        {items.map((u) => (
          <li key={u.id} className="flex items-center gap-3 rounded-lg p-2 hover:bg-surface-2">
            <Link href={`/user/${u.username ?? u.id}`} className="flex min-w-0 flex-1 items-center gap-3">
              <Avatar src={u.image} name={u.name} size={48} />
              <div className="min-w-0">
                <div className="truncate font-semibold">{u.name}</div>
                {u.viewer?.followsYou ? (
                  <div className="text-xs text-muted">{t("profile.followsYou")}</div>
                ) : null}
              </div>
            </Link>
            {me && me.id !== u.id ? (
              <Button
                size="sm"
                variant={u.viewer?.following ? "outline" : "primary"}
                onClick={() =>
                  follow.mutate(
                    { userId: u.id, follow: !u.viewer?.following },
                    { onSuccess: () => list.refetch() },
                  )
                }
              >
                {u.viewer?.following ? t("common.following") : t("common.follow")}
              </Button>
            ) : null}
          </li>
        ))}
      </ul>
      {!list.isLoading && !items.length ? (
        <p className="py-10 text-center text-muted">{t("common.empty")}</p>
      ) : null}
    </div>
  );
}
