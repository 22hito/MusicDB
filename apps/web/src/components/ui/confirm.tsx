"use client";
/**
 * Модальне підтвердження дій замість системного confirm(): `await confirm({ title, … })` повертає true/false.
 * Одне вікно на застосунок — <ConfirmHost /> у провайдерах.
 */
import { create } from "zustand";
import { Button } from "./button";
import { Dialog } from "./dialog";

type Request = {
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  resolve: (ok: boolean) => void;
};

const useConfirmStore = create<{ request: Request | null }>(() => ({ request: null }));

export function confirm(opts: Omit<Request, "resolve">): Promise<boolean> {
  return new Promise((resolve) => {
    useConfirmStore.getState().request?.resolve(false);
    useConfirmStore.setState({ request: { ...opts, resolve } });
  });
}

export function ConfirmHost({ cancel, ok }: { cancel: string; ok: string }) {
  const request = useConfirmStore((s) => s.request);
  const close = (result: boolean) => {
    request?.resolve(result);
    useConfirmStore.setState({ request: null });
  };
  return (
    <Dialog
      open={!!request}
      onOpenChange={(o) => !o && close(false)}
      title={request?.title ?? ""}
      {...(request?.description ? { description: request.description } : {})}
    >
      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={() => close(false)}>
          {request?.cancelLabel ?? cancel}
        </Button>
        <Button variant={request?.danger ? "danger" : "primary"} autoFocus onClick={() => close(true)}>
          {request?.confirmLabel ?? ok}
        </Button>
      </div>
    </Dialog>
  );
}
