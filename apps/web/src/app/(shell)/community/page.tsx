import type { Metadata } from "next";
import { CommunityView } from "@/components/pages/community";
import { getT } from "@/lib/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("community.title") };
}

export default function CommunityPage() {
  return <CommunityView />;
}
