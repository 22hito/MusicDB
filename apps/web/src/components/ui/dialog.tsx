"use client";
import { X } from "lucide-react";
import { Dialog as D } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  children,
  className,
  trigger,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
  trigger?: ReactNode;
}) {
  return (
    <D.Root {...(open !== undefined ? { open } : {})} {...(onOpenChange ? { onOpenChange } : {})}>
      {trigger ? <D.Trigger asChild>{trigger}</D.Trigger> : null}
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 animate-fade-in bg-overlay backdrop-blur-[2px]" />
        <D.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-32px)] w-[calc(100vw-32px)] max-w-[480px] -translate-x-1/2 -translate-y-1/2 animate-rise overflow-y-auto rounded-xl bg-surface-2 p-6 shadow-2xl shadow-black/60 ring-1 ring-line focus:outline-none",
            className,
          )}
        >
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <D.Title className="text-xl font-extrabold tracking-tight">{title}</D.Title>
              {description ? (
                <D.Description className="mt-1 text-sm text-muted">{description}</D.Description>
              ) : null}
            </div>
            <D.Close
              className="-m-1 rounded-full p-1.5 text-muted hover:bg-surface-3 hover:text-fg"
              aria-label="Закрити"
            >
              <X className="size-5" />
            </D.Close>
          </div>
          {children}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}

export const DialogClose = D.Close;
