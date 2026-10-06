import Link from "next/link";
import { Logo } from "@/components/shell/logo";
import { getT } from "@/lib/server";

export default async function NotFound() {
  const t = await getT();
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center">
      <Logo className="h-12" withText={false} />
      <h1 className="text-4xl font-black tracking-tight">{t("common.notFound")}</h1>
      <Link
        href="/"
        className="rounded-full bg-fg px-6 py-3 font-bold text-bg transition-transform hover:scale-105"
      >
        {t("nav.home")}
      </Link>
    </main>
  );
}
