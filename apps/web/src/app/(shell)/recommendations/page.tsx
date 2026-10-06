import type { Metadata } from "next";
import { RecommendationsView } from "@/components/pages/discover";
import { getT } from "@/lib/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("nav.recommendations") };
}

export default function Page() {
  return <RecommendationsView />;
}
