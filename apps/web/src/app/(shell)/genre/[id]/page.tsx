import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GenreView } from "@/components/pages/collections";
import { getGenre } from "@/lib/server-data";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const g = await getGenre(id);
  return g ? { title: g.name } : {};
}

export default async function GenrePage({ params }: Props) {
  const { id } = await params;
  const genre = await getGenre(id);
  if (!genre) notFound();
  return <GenreView slug={genre.slug} initial={genre} />;
}
