"use client";
import { Slot, Tooltip as TooltipPrimitive } from "radix-ui";
import { type ButtonHTMLAttributes, forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "accent";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary: "accent-grad hover:scale-[1.03] active:scale-[0.97]",
  accent: "accent-grad hover:scale-[1.03] active:scale-[0.97]",
  secondary: "bg-surface-3 text-fg hover:bg-elevated",
  outline: "border border-line-strong text-fg hover:border-fg hover:scale-[1.02]",
  ghost: "text-muted hover:text-fg hover:bg-surface-2",
  danger: "bg-danger text-on-danger hover:scale-[1.02] active:scale-[0.97]",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px]",
  md: "h-10 px-5 text-sm",
  lg: "h-12 px-8 text-[15px]",
};

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
  loading?: boolean;
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = "primary", size = "md", asChild, loading, className, children, disabled, ...props },
  ref,
) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      ref={ref}
      className={cn(
        "inline-flex shrink-0 items-center justify-center gap-2 rounded-full font-bold whitespace-nowrap transition-[transform,background-color,color,border-color,opacity] duration-150 ease-[var(--ease-standard)] disabled:pointer-events-none disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      disabled={disabled || loading}
      {...props}
    >
      {asChild ? (
        children
      ) : (
        <>
          {loading ? <Spinner className="size-4" /> : null}
          {children}
        </>
      )}
    </Comp>
  );
});

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  label: string;
  size?: "xs" | "sm" | "md" | "lg";
  active?: boolean;
  tooltip?: boolean;
  tooltipSide?: "top" | "bottom" | "left" | "right";
};

const iconSizes = { xs: "size-7", sm: "size-8", md: "size-9", lg: "size-11" };

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { label, size = "md", active, tooltip = true, tooltipSide = "top", className, children, ...props },
  ref,
) {
  const button = (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      aria-pressed={active}
      className={cn(
        "relative inline-flex shrink-0 items-center justify-center rounded-full text-muted transition-[color,transform,background-color] duration-150 hover:text-fg active:scale-90 disabled:pointer-events-none disabled:opacity-40",
        iconSizes[size],
        active && "text-accent hover:text-accent-strong",
        className,
      )}
      {...props}
    >
      {children}
      {active ? (
        <span className="absolute bottom-0.5 left-1/2 size-1 -translate-x-1/2 rounded-full bg-current" />
      ) : null}
    </button>
  );
  if (!tooltip) return button;
  return (
    <Tooltip content={label} side={tooltipSide}>
      {button}
    </Tooltip>
  );
});

export function Tooltip({
  content,
  children,
  side = "top",
}: {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <TooltipPrimitive.Root delayDuration={400}>
      <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
      <TooltipPrimitive.Portal>
        <TooltipPrimitive.Content
          side={side}
          sideOffset={6}
          className="z-50 animate-fade-in rounded-md bg-elevated px-2.5 py-1.5 text-[13px] font-semibold text-fg shadow-xl shadow-black/40"
        >
          {content}
        </TooltipPrimitive.Content>
      </TooltipPrimitive.Portal>
    </TooltipPrimitive.Root>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
