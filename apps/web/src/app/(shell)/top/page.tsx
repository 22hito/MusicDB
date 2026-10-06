import type { Metadata } from "next";
import { TopView } from "@/components/pages/discover";
import { getT } from "@/lib/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("nav.top") };
}

export default function Page() {
  return <TopView />;
}
