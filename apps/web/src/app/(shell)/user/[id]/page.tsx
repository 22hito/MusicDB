import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { ProfileView } from "@/components/pages/profile";
import { getProfile, resolveLegacy } from "@/lib/server-data";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const p = await getProfile(id);
  if (!p) return {};
  return {
    title: p.name,
    description: p.bio ?? undefined,
    openGraph: { type: "profile", ...(p.image ? { images: [{ url: p.image }] } : {}) },
  };
}

export default async function UserPage({ params }: Props) {
  const { id } = await params;
  const profile = await getProfile(id);
  if (!profile) {
    // Старе посилання v1 з числовим id — постійний редирект на нову адресу.
    const legacy = await resolveLegacy("user", id);
    if (legacy) permanentRedirect(`/user/${legacy.slug ?? legacy.id}`);
    notFound();
  }
  return <ProfileView id={id} initial={profile} />;
}
