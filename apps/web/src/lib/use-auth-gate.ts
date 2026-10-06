"use client";
import { useMe } from "@musicdb/sdk/react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
import { toast } from "sonner";
import { useT } from "./i18n";

/** Обгортка для дій, що потребують входу: гостю — підказка й перехід на сторінку входу. */
export function useAuthGate() {
  const me = useMe();
  const router = useRouter();
  const pathname = usePathname();
  const t = useT();
  return useCallback(
    <A extends unknown[]>(action: (...args: A) => void, message?: string) =>
      (...args: A) => {
        if (me.data) return action(...args);
        toast(message ?? t("auth.signInRequired"), {
          action: {
            label: t("common.signIn"),
            onClick: () => router.push(`/login?next=${encodeURIComponent(pathname)}`),
          },
        });
      },
    [me.data, router, pathname, t],
  );
}
