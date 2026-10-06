import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { AlbumView } from "@/components/pages/album";
import { getT } from "@/lib/server";
import { getRelease } from "@/lib/server-data";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const r = await getRelease(id);
  if (!r) return {};
  const t = await getT();
  const by = r.artists.map((a) => a.name).join(", ");
  const description = `${t(`release.${r.type}`)} · ${by}${r.releaseDate ? ` · ${r.releaseDate.slice(0, 4)}` : ""} · ${t("release.songs", { count: r.tracks.length })}`;
  return {
    title: `${r.title} — ${by}`,
    description,
    openGraph: {
      title: r.title,
      description,
      type: "music.album",
      ...(r.coverUrl ? { images: [{ url: r.coverUrl }] } : {}),
    },
  };
}

export default async function AlbumPage({ params }: Props) {
  const { id } = await params;
  const release = await getRelease(id);
  if (!release) notFound();
  return <AlbumView id={id} initial={release} />;
}
