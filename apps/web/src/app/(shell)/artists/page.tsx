import type { Metadata } from "next";
import { ArtistsView } from "@/components/pages/discover";
import { getT } from "@/lib/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("nav.artists") };
}

export default function Page() {
  return <ArtistsView />;
}
