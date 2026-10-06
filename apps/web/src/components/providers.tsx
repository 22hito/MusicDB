"use client";
import type { Locale } from "@musicdb/i18n";
import { connectRealtime } from "@musicdb/sdk";
import { ApiProvider, applyRealtimeEvent, startPolling, useMe } from "@musicdb/sdk/react";
import { QueryClient, QueryClientProvider, useQueryClient } from "@tanstack/react-query";
import { MotionConfig } from "motion/react";
import { Tooltip } from "radix-ui";
import { type ReactNode, useEffect, useState } from "react";
import { Toaster, toast } from "sonner";
import { TrackEditorHost } from "@/components/admin/track-editor";
import { client, realtimeUrl } from "@/lib/api";
import { I18nProvider, useT } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import { ReportDialog } from "./report-dialog";
import { ConfirmHost } from "./ui/confirm";

export function Providers({ locale, children }: { locale: Locale; children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 10 * 60_000,
            retry: (count, err) =>
              count < 2 &&
              !(err && "status" in err && [401, 403, 404, 422].includes((err as { status: number }).status)),
            refetchOnWindowFocus: false,
          },
        },
      }),
  );
  const motion = useSettings((s) => s.motion);
  return (
    <MotionConfig reducedMotion={motion === "full" ? "never" : motion === "reduced" ? "always" : "user"}>
      <QueryClientProvider client={queryClient}>
        <ApiProvider client={client}>
          <I18nProvider initialLocale={locale}>
            <Tooltip.Provider delayDuration={400} skipDelayDuration={200}>
              {children}
              <RealtimeSync />
              <ReportDialog />
              <ConfirmLayer />
              <TrackEditorHost />
              <Toaster
                position="bottom-center"
                offset={104}
                mobileOffset={136}
                toastOptions={{
                  className:
                    "!bg-elevated !text-fg !border !border-line !rounded-xl !font-semibold !shadow-2xl !shadow-black/50 [&_[data-button]]:!bg-accent [&_[data-button]]:!text-on-accent",
                }}
              />
            </Tooltip.Provider>
          </I18nProvider>
        </ApiProvider>
      </QueryClientProvider>
    </MotionConfig>
  );
}

/** WebSocket для залогінених: події сервера оновлюють кеш запитів; нове повідомлення — тост. */
/** На Vercel WebSocket немає (NEXT_PUBLIC_REALTIME=off) — тоді опитування. */
const REALTIME_ON = process.env.NEXT_PUBLIC_REALTIME !== "off";

function RealtimeSync() {
  const me = useMe().data;
  const qc = useQueryClient();
  const t = useT();
  useEffect(() => {
    if (!me || REALTIME_ON) return;
    return startPolling(qc, {
      isVisible: () => document.visibilityState === "visible",
      inMessages: () => location.pathname.startsWith("/messages"),
    });
  }, [me, qc]);
  useEffect(() => {
    if (!me || !REALTIME_ON) return;
    const conn = connectRealtime({
      url: realtimeUrl(),
      onEvent: (event) => {
        applyRealtimeEvent(qc, event);
        if (
          event.type === "message" &&
          event.message.sender?.id !== me.id &&
          !location.pathname.startsWith(`/messages/${event.message.conversationId}`)
        ) {
          toast(event.message.sender?.name ?? t("messages.title"), {
            description: event.message.body || "📎",
          });
        }
      },
    });
    const onVisible = () => document.visibilityState === "visible" && conn.reconnect();
    const onOnline = () => conn.reconnect();
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("online", onOnline);
    return () => {
      conn.close();
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("online", onOnline);
    };
  }, [me, qc, t]);
  return null;
}

function ConfirmLayer() {
  const t = useT();
  return <ConfirmHost cancel={t("common.cancel")} ok={t("common.confirm")} />;
}
