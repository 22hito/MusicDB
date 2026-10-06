"use client";
import { Minus, Plus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/cn";

/** Поле числа з кнопками −/+ (утримання — швидка зміна), як у налаштуваннях колеса v1. */
export function NumStepper({
  value,
  min,
  max,
  onChange,
  label,
  className,
  disabled,
}: {
  value: number;
  min: number;
  max: number;
  onChange: (v: number) => void;
  label: string;
  className?: string;
  disabled?: boolean;
}) {
  const [text, setText] = useState(String(value));
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(value);
  latest.current = value;
  useEffect(() => setText(String(value)), [value]);
  // biome-ignore lint/correctness/useExhaustiveDependencies: зупинити повтор лише при розмонтуванні
  useEffect(() => () => stop(), []);

  const clamp = (v: number) => Math.min(max, Math.max(min, v));
  const step = (d: number) => onChange(clamp(latest.current + d));
  const start = (d: number) => {
    // Заблоковані кнопки в Chrome усе одно отримують pointerdown — перевіряємо самі.
    if (disabled) return;
    step(d);
    let delay = 380;
    const tick = () => {
      step(d);
      delay = Math.max(50, delay * 0.8);
      timer.current = setTimeout(tick, delay);
    };
    timer.current = setTimeout(tick, delay);
  };
  function stop() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  return (
    <span
      className={cn(
        "inline-flex h-9 items-center rounded-full border border-line bg-surface-2/70",
        className,
      )}
    >
      <button
        type="button"
        aria-label={`${label} −`}
        disabled={disabled || value <= min}
        onPointerDown={() => start(-1)}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        className="flex size-9 items-center justify-center rounded-full text-muted hover:text-fg disabled:opacity-40"
      >
        <Minus className="size-4" />
      </button>
      <input
        value={text}
        inputMode="numeric"
        disabled={disabled}
        aria-label={label}
        onFocus={(e) => e.target.select()}
        onChange={(e) => setText(e.target.value.replace(/\D/g, "").slice(0, 4))}
        onBlur={() => {
          const n = Number.parseInt(text, 10);
          if (Number.isNaN(n)) setText(String(value));
          else onChange(clamp(n));
        }}
        onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        className="w-10 bg-transparent text-center text-sm font-semibold tabular-nums outline-none"
      />
      <button
        type="button"
        aria-label={`${label} +`}
        disabled={disabled || value >= max}
        onPointerDown={() => start(1)}
        onPointerUp={stop}
        onPointerLeave={stop}
        onPointerCancel={stop}
        className="flex size-9 items-center justify-center rounded-full text-muted hover:text-fg disabled:opacity-40"
      >
        <Plus className="size-4" />
      </button>
    </span>
  );
}
