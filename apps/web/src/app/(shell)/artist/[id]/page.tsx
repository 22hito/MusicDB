import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { ArtistView } from "@/components/pages/artist";
import { getT } from "@/lib/server";
import { getArtist, resolveLegacy } from "@/lib/server-data";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const a = await getArtist(id);
  if (!a) return {};
  const t = await getT();
  const description = (
    a.bio?.uk ??
    a.bio?.en ??
    t("artist.monthlyListeners", { count: a.monthlyListeners })
  ).slice(0, 200);
  return {
    title: a.name,
    description,
    openGraph: {
      title: a.name,
      description,
      type: "profile",
      ...(a.imageUrl ? { images: [{ url: a.imageUrl }] } : {}),
    },
  };
}

export default async function ArtistPage({ params }: Props) {
  const { id } = await params;
  const artist = await getArtist(id);
  if (!artist) {
    // Старе посилання v1 з числовим id — постійний редирект на нову адресу.
    const legacy = await resolveLegacy("artist", id);
    if (legacy) permanentRedirect(`/artist/${legacy.slug ?? legacy.id}`);
    notFound();
  }
  return <ArtistView id={id} initial={artist} />;
}
