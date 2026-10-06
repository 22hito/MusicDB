import type { Metadata } from "next";
import { TasteView } from "@/components/pages/taste";
import { getT } from "@/lib/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("nav.taste") };
}

export default function Page() {
  return <TasteView />;
}
