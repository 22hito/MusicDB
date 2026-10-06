import type { Metadata } from "next";
import { ExploreView } from "@/components/pages/discover";
import { getT } from "@/lib/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("nav.explore") };
}

export default function Page() {
  return <ExploreView />;
}
