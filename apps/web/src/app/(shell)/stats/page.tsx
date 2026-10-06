import type { Metadata } from "next";
import { StatsView } from "@/components/pages/stats";
import { getT } from "@/lib/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("nav.stats") };
}

export default function Page() {
  return <StatsView />;
}
