import type { Metadata } from "next";
import { BattleView } from "@/components/pages/battle";
import { getT } from "@/lib/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("nav.battle") };
}

export default function Page() {
  return <BattleView />;
}
