import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrackView } from "@/components/pages/track";
import { getTrack } from "@/lib/server-data";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const tr = await getTrack(id);
  if (!tr) return {};
  const by = tr.artists.map((a) => a.name).join(", ");
  return {
    title: `${tr.title} — ${by}`,
    description: [by, tr.release?.title, tr.releaseDate?.slice(0, 4)].filter(Boolean).join(" · "),
    openGraph: {
      title: tr.title,
      type: "music.song",
      ...(tr.release?.coverUrl ? { images: [{ url: tr.release.coverUrl }] } : {}),
    },
  };
}

export default async function TrackPage({ params }: Props) {
  const { id } = await params;
  const track = await getTrack(id);
  if (!track) notFound();
  return <TrackView id={id} initial={track} />;
}
