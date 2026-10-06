"use client";
import { motion } from "motion/react";
import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/** Текст заголовка (двоскладові заголовки v1 — «Колесо» + «фортуни» — тепер звичайним рядком, без ефектів). */
export function HlText({ text, accent }: { text: string; accent?: string }) {
  return <>{accent !== undefined ? `${text} ${accent}` : text}</>;
}

/** Шапка розділу: «Топ 100 найпрослуханіших», «Колесо фортуни» тощо. */
export function PageTitle({
  pre,
  accent,
  sub,
  actions,
  className,
}: {
  pre: string;
  accent: string;
  sub?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn("flex flex-wrap items-end justify-between gap-4 px-4 pt-4 pb-5 sm:px-6", className)}
    >
      <div className="min-w-0">
        <h1 className="serif-title text-[32px] leading-[1.1] sm:text-[40px]">
          <HlText text={pre} accent={accent} />
        </h1>
        {sub ? <p className="mt-2 max-w-2xl text-[15px] text-muted">{sub}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  );
}

/** Сегментований перемикач (як .seg-switch у v1). */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className,
  disabled,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  className?: string;
  disabled?: boolean;
}) {
  const id = useId();
  return (
    <div
      className={cn(
        "relative isolate inline-flex rounded-full border border-line bg-surface-2/70 p-1",
        className,
      )}
      role="tablist"
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="tab"
          aria-selected={value === o.value}
          disabled={disabled}
          onClick={() => !disabled && onChange(o.value)}
          className={cn(
            "relative inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold whitespace-nowrap transition-colors duration-200",
            value === o.value ? "text-accent" : "text-muted hover:text-fg",
          )}
        >
          {value === o.value ? (
            <motion.span
              layoutId={`seg-${id}`}
              className="absolute inset-0 -z-10 rounded-full bg-accent-soft"
              transition={{ type: "spring", stiffness: 520, damping: 38 }}
            />
          ) : null}
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Число, що «набігає» від нуля (статистика, лічильники). Поважає «зменшені анімації». */
export function CountUp({ value, duration = 900 }: { value: number; duration?: number }) {
  const [shown, setShown] = useState(0);
  const from = useRef(0);
  useEffect(() => {
    const reduce =
      document.documentElement.dataset.motion === "reduced" ||
      (document.documentElement.dataset.motion === "system" &&
        matchMedia("(prefers-reduced-motion: reduce)").matches);
    if (reduce) {
      setShown(value);
      return;
    }
    const start = performance.now();
    const a = from.current;
    let raf = 0;
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - p) ** 4;
      setShown(Math.round(a + (value - a) * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
      else from.current = value;
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);
  return <>{shown.toLocaleString("uk-UA")}</>;
}
