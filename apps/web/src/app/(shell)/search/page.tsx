import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchView } from "@/components/pages/search";
import { getT } from "@/lib/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("common.search") };
}

export default function SearchPage() {
  return (
    <Suspense>
      <SearchView />
    </Suspense>
  );
}
