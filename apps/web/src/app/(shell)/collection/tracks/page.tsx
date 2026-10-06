import type { Metadata } from "next";
import { LikedSongsView } from "@/components/pages/collections";
import { getT } from "@/lib/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("nav.likedSongs"), robots: { index: false } };
}

export default function LikedSongsPage() {
  return <LikedSongsView />;
}
