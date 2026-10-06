"use client";
import { useId } from "react";

/** Сова N'Owl: тіло — градієнт акценту, очі-бурштини (кольори беруться з теми й акценту). */
function OwlShape({ gradientId }: { gradientId: string }) {
  return (
    <>
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="var(--n-accent-strong, #FFCB5C)" />
          <stop offset="1" stopColor="var(--n-accent, #F5B83D)" />
        </linearGradient>
      </defs>
      <path
        d="M6 6.5 10.5 9a9.5 9.5 0 0 1 11 0L26 6.5V18a10 10 0 0 1-20 0V6.5Z"
        fill={`url(#${gradientId})`}
      />
      <circle cx="12" cy="15.5" r="4.2" fill="var(--n-bg, #09090D)" />
      <circle cx="20" cy="15.5" r="4.2" fill="var(--n-bg, #09090D)" />
      <circle className="owl-eye" cx="12.6" cy="15.2" r="1.6" fill="var(--n-accent, #F5B83D)" />
      <circle className="owl-eye" cx="20.6" cy="15.2" r="1.6" fill="var(--n-accent, #F5B83D)" />
      <path d="M16 19.2 14.6 21.6h2.8L16 19.2Z" fill="var(--n-bg, #09090D)" />
    </>
  );
}

/** Лише знак сови (колесо фортуни, порожні стани). */
export function OwlGlyph({ className }: { className?: string }) {
  const id = useId();
  return (
    <svg viewBox="0 0 32 32" className={className} aria-hidden>
      <OwlShape gradientId={`owl-${id}`} />
    </svg>
  );
}

/** Логотип N'Owl: сова + назва. Висота — з className. */
export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  const id = useId();
  return (
    <svg
      viewBox={withText ? "0 0 132 32" : "0 0 32 32"}
      className={`owl-logo ${className ?? ""}`}
      role="img"
      aria-label="N'Owl"
    >
      <OwlShape gradientId={`owl-${id}`} />
      {withText ? (
        <text
          x="36"
          y="23"
          fill="currentColor"
          fontFamily="var(--font-inter), sans-serif"
          fontSize="20"
          fontWeight="900"
          letterSpacing="-0.8"
        >
          N&apos;Owl
        </text>
      ) : null}
    </svg>
  );
}
