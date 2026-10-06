"use client";
/**
 * Меню: одна декларація пунктів — і для кнопки «⋯» (DropdownMenu), і для правого кліку (ContextMenu).
 */
import { Check, ChevronRight } from "lucide-react";
import { ContextMenu as CM, DropdownMenu as DM } from "radix-ui";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type MenuItem =
  | {
      type?: "item";
      label: string;
      icon?: ReactNode;
      onSelect: () => void;
      danger?: boolean;
      disabled?: boolean;
      checked?: boolean;
      shortcut?: string;
    }
  | { type: "separator" }
  | { type: "submenu"; label: string; icon?: ReactNode; items: MenuItem[] }
  | { type: "label"; label: string };

const contentClass =
  "z-50 min-w-[220px] max-w-[340px] animate-fade-in overflow-hidden rounded-md bg-elevated p-1 text-sm text-fg shadow-2xl shadow-black/50 ring-1 ring-line";
const itemClass =
  "flex h-10 cursor-default items-center gap-3 rounded-sm px-3 font-medium outline-none select-none data-[disabled]:opacity-40 data-[highlighted]:bg-surface-3";

type Kit = typeof DM | typeof CM;

function renderItems(kit: Kit, items: MenuItem[]) {
  return items.map((item, i) => {
    if (item.type === "separator") return <kit.Separator key={i} className="my-1 h-px bg-line" />;
    if (item.type === "label")
      return (
        <kit.Label key={i} className="px-3 py-2 text-xs font-semibold text-subtle">
          {item.label}
        </kit.Label>
      );
    if (item.type === "submenu") {
      return (
        <kit.Sub key={i}>
          <kit.SubTrigger className={cn(itemClass, "data-[state=open]:bg-surface-3")}>
            <span className="text-muted [&_svg]:size-4">{item.icon}</span>
            <span className="flex-1 truncate">{item.label}</span>
            <ChevronRight className="size-4 text-muted" />
          </kit.SubTrigger>
          <kit.Portal>
            <kit.SubContent className={cn(contentClass, "max-h-[60vh] overflow-y-auto")} sideOffset={4}>
              {renderItems(kit, item.items)}
            </kit.SubContent>
          </kit.Portal>
        </kit.Sub>
      );
    }
    return (
      <kit.Item
        key={i}
        disabled={item.disabled}
        onSelect={item.onSelect}
        className={cn(itemClass, item.danger && "text-danger")}
      >
        <span className={cn("text-muted [&_svg]:size-4", item.danger && "text-danger")}>{item.icon}</span>
        <span className="flex-1 truncate">{item.label}</span>
        {item.checked ? <Check className="size-4 text-accent" /> : null}
        {item.shortcut ? <span className="text-xs text-subtle">{item.shortcut}</span> : null}
      </kit.Item>
    );
  });
}

export function DropdownMenu({
  trigger,
  items,
  align = "end",
  side = "bottom",
}: {
  trigger: ReactNode;
  items: MenuItem[];
  align?: "start" | "center" | "end";
  side?: "top" | "bottom" | "left" | "right";
}) {
  return (
    <DM.Root modal={false}>
      <DM.Trigger asChild>{trigger}</DM.Trigger>
      <DM.Portal>
        <DM.Content align={align} side={side} sideOffset={6} collisionPadding={12} className={contentClass}>
          {renderItems(DM, items)}
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}

export function ContextMenu({
  children,
  items,
}: {
  children: ReactNode;
  items: MenuItem[] | (() => MenuItem[]);
}) {
  return (
    <CM.Root modal={false}>
      <CM.Trigger asChild>{children}</CM.Trigger>
      <CM.Portal>
        <CM.Content collisionPadding={12} className={contentClass}>
          {renderItems(CM, typeof items === "function" ? items() : items)}
        </CM.Content>
      </CM.Portal>
    </CM.Root>
  );
}
