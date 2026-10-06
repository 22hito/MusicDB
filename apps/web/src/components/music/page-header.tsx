"use client";
import type { ReactNode } from "react";
import { Cover } from "@/components/ui/cover";
import { Vinyl } from "@/components/ui/vinyl";
import { cn } from "@/lib/cn";
import { useDominantColor } from "@/lib/color";
import { usePlayer } from "@/player/store";

/**
 * Шапка сторінки-контексту (альбом, плейлист, трек, жанр) у дусі «вкладки платівки»: обкладинка
 * (для альбомів і треків — з платівкою, що виглядає з конверта й обертається, коли цей контекст грає),
 * тип дрібними капітелями з акцентною рискою, звичайний серифний заголовок і метадані.
 * Тло — м'яке сяйво кольору обкладинки в кутку, а не суцільний градієнт на всю ширину.
 */
export function PageHeader({
  image,
  imageMosaic,
  seed,
  kind,
  title,
  meta,
  round,
  disc,
  art,
  glow,
  children,
}: {
  image: string | null | undefined;
  imageMosaic?: string[];
  seed: string;
  kind: string;
  title: string;
  meta?: ReactNode;
  round?: boolean;
  /** Показати платівку за обкладинкою; `playing` — чи грає саме цей контекст. */
  disc?: { playing: boolean };
  /** Власна «обкладинка» замість зображення (жанр, вподобані). */
  art?: ReactNode;
  /** Колір сяйва, якщо немає зображення. */
  glow?: string;
  children?: ReactNode;
}) {
  const dominant = useDominantColor(image ?? imageMosaic?.[0], seed);
  const color = glow ?? dominant;
  const spinning = usePlayer((s) => s.status === "playing") && !!disc?.playing;
  const long = title.length > 36;
  return (
    <div className="relative">
      <div
        className="pointer-events-none absolute inset-x-0 -top-16 h-[calc(100%+200px)] transition-[background] duration-700"
        style={{
          background: `radial-gradient(60% 75% at 12% 0%, color-mix(in srgb, ${color} 55%, transparent), transparent 70%), radial-gradient(40% 50% at 85% 10%, color-mix(in srgb, ${color} 18%, transparent), transparent 70%)`,
        }}
        aria-hidden
      />
      <header className="relative flex flex-col items-center gap-6 px-4 pt-6 pb-4 sm:flex-row sm:items-end sm:gap-8 sm:px-6 sm:pt-8">
        <div className={cn("relative shrink-0", disc && "sm:mr-10")}>
          {disc ? (
            <Vinyl
              src={image}
              seed={seed}
              imageSize={208}
              playing={spinning}
              className="absolute top-[4%] right-0 h-[92%] w-[92%] translate-x-[30%] sm:translate-x-[36%]"
            />
          ) : null}
          {art ?? (
            <Cover
              src={image}
              {...(imageMosaic ? { mosaic: imageMosaic } : {})}
              alt={title}
              size={208}
              seed={seed}
              priority
              rounded={round ? "full" : "md"}
              className="relative w-40 shadow-[0_18px_44px_-16px_rgba(0,0,0,0.85)] sm:w-44 xl:w-52"
            />
          )}
        </div>
        <div className="flex min-w-0 flex-col items-center text-center sm:items-start sm:text-left">
          <span className="flex items-center gap-2 text-[11px] font-bold tracking-[0.18em] text-accent uppercase">
            <span className="h-px w-5 bg-accent" aria-hidden />
            {kind}
          </span>
          <h1
            className={cn(
              "serif-title mt-2.5 text-balance text-fg",
              long
                ? "text-[26px] sm:text-[32px] xl:text-[36px]"
                : "text-[32px] sm:text-[40px] xl:text-[48px]",
            )}
            style={{ lineHeight: 1.08 }}
          >
            {title}
          </h1>
          {meta ? (
            <div className="mt-3 flex flex-wrap items-center justify-center gap-x-1.5 gap-y-1 text-[13.5px] text-muted sm:justify-start">
              {meta}
            </div>
          ) : null}
        </div>
      </header>
      {children ? <div className="relative">{children}</div> : null}
    </div>
  );
}

/** «Обкладинка» без зображення: градієнт і символ (жанр, вподобані). */
export function HeaderArt({ from, to, children }: { from: string; to: string; children: ReactNode }) {
  return (
    <div
      className="relative flex aspect-square w-40 items-center justify-center rounded-md shadow-[0_18px_44px_-16px_rgba(0,0,0,0.85)] sm:w-44 xl:w-52"
      style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
    >
      {children}
    </div>
  );
}

/**
 * Рядок дій під шапкою: головна кнопка — пігулка «Відтворити», решта — однакові обведені кружечки.
 */
export function ActionBar({ children }: { children: ReactNode }) {
  return (
    <div className="relative flex flex-wrap items-center gap-2.5 px-4 py-4 sm:px-6 [&>button:not(.accent-grad)]:size-11 [&>button:not(.accent-grad)]:rounded-full [&>button:not(.accent-grad)]:border [&>button:not(.accent-grad)]:border-line [&>button:not(.accent-grad)]:hover:border-line-strong [&>button:not(.accent-grad)>svg]:size-5">
      {children}
    </div>
  );
}

export function Dot() {
  return <span className="text-subtle">·</span>;
}
