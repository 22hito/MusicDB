import Link from "next/link";
import type { ReactNode } from "react";

export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  updated: string;
  children: ReactNode;
}) {
  return (
    <article className="mx-auto max-w-3xl px-4 pt-6 pb-16 sm:px-6 [&_a]:text-accent [&_a]:underline-offset-2 hover:[&_a]:underline [&_h2]:mt-8 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:tracking-tight [&_li]:mt-1.5 [&_p]:mt-3 [&_p]:leading-relaxed [&_p]:text-fg/85 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:text-fg/85">
      <nav className="mb-6 flex gap-4 text-sm font-semibold text-muted">
        <Link href="/legal/privacy" className="!text-muted hover:!text-fg">
          Конфіденційність
        </Link>
        <Link href="/legal/terms" className="!text-muted hover:!text-fg">
          Умови
        </Link>
      </nav>
      <h1 className="text-4xl font-black tracking-tight">{title}</h1>
      <p className="!mt-2 text-sm !text-muted">Оновлено: {updated}</p>
      {children}
    </article>
  );
}
