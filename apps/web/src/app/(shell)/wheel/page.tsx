import type { Metadata } from "next";
import { WheelView } from "@/components/pages/wheel";
import { getT } from "@/lib/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("nav.wheel") };
}

export default function Page() {
  return <WheelView />;
}
