import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { PlaylistView } from "@/components/pages/playlist";
import { getPlaylist, resolveLegacy } from "@/lib/server-data";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = await getPlaylist(id);
  if (!p) return {};
  const image = p.coverUrl ?? p.mosaic[0];
  return {
    title: p.title,
    description: p.description ?? `${p.owner.name} · ${p.trackCount}`,
    robots: p.visibility === "public" ? undefined : { index: false },
    openGraph: { title: p.title, type: "music.playlist", ...(image ? { images: [{ url: image }] } : {}) },
  };
}

export default async function PlaylistPage({ params }: Props) {
  const { id } = await params;
  const playlist = await getPlaylist(id);
  if (!playlist) {
    // Старе посилання v1 з числовим id — постійний редирект на нову адресу.
    const legacy = await resolveLegacy("playlist", id);
    if (legacy) permanentRedirect(`/playlist/${legacy.slug ?? legacy.id}`);
    notFound();
  }
  return <PlaylistView id={id} initial={playlist} />;
}
