import type { Metadata } from "next";
import { Suspense } from "react";
import { CatalogView } from "@/components/pages/catalog";
import { getT } from "@/lib/server";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getT())("nav.catalog") };
}

export default function Page() {
  return (
    <Suspense>
      <CatalogView />
    </Suspense>
  );
}
