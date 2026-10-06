import type { Metadata } from "next";
import { TimeMachineView } from "@/components/pages/time-machine";
import { getT } from "@/lib/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("nav.timeMachine") };
}

export default function Page() {
  return <TimeMachineView />;
}
