"use client";
import { endpoints } from "@musicdb/contracts/client";
import { invalidate, useApi, useEndpoint, useMe } from "@musicdb/sdk/react";
import { useQueryClient } from "@tanstack/react-query";
import { Check, Download, Heart, MonitorSmartphone, WifiOff } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/shell/logo";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export function PremiumView() {
  const { t, locale } = useI18n();
  const api = useApi();
  const qc = useQueryClient();
  const me = useMe().data;
  const plans = useEndpoint(endpoints.premium.plans);
  const sub = useEndpoint(endpoints.premium.subscription, undefined, { enabled: !!me });
  const [busy, setBusy] = useState(false);
  const plan = plans.data?.plans[0];
  const fmt = (iso: string) =>
    new Date(iso).toLocaleDateString(locale === "uk" ? "uk-UA" : "en-US", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });

  const checkout = async () => {
    if (!plan) return;
    setBusy(true);
    try {
      const res = await api.premium.checkout({ body: { planId: plan.id } });
      if (res.type === "redirect") {
        location.href = res.url;
        return;
      }
      toast(t("premium.activated"));
      await invalidate(qc, endpoints.premium.subscription, endpoints.me.get);
    } catch {
      toast.error(t("premium.disabled"));
    } finally {
      setBusy(false);
    }
  };

  const benefits = [
    { icon: <WifiOff className="size-5" />, text: t("premium.benefitOffline") },
    { icon: <Download className="size-5" />, text: t("premium.benefitPlaylists") },
    { icon: <MonitorSmartphone className="size-5" />, text: t("premium.benefitDevices") },
    { icon: <Heart className="size-5" />, text: t("premium.benefitSupport") },
  ];

  return (
    <div className="relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[700px] -translate-x-1/2 rounded-full bg-accent/20 blur-[140px]" />
      <div className="relative mx-auto max-w-4xl px-4 pt-10 pb-16 sm:px-6">
        <div className="flex flex-col items-center text-center">
          <Logo className="h-12" withText={false} />
          <h1 className="mt-6 text-4xl font-black tracking-tight sm:text-6xl">{t("premium.title")}</h1>
          <p className="mt-3 text-lg text-muted">{t("premium.subtitle")}</p>
        </div>

        <div className="mt-12 grid gap-6 md:grid-cols-[1fr_380px]">
          <ul className="space-y-4">
            {benefits.map((b) => (
              <li key={b.text} className="flex items-center gap-4 rounded-xl bg-surface-2/70 p-4">
                <span className="flex size-10 items-center justify-center rounded-full bg-accent-soft text-accent">
                  {b.icon}
                </span>
                <span className="text-[15px] font-semibold">{b.text}</span>
              </li>
            ))}
            <p className="px-1 text-sm text-muted">{t("premium.note")}</p>
          </ul>

          <div className="rounded-2xl bg-surface-2 p-6 shadow-2xl ring-1 ring-line">
            <div className="text-sm font-bold text-accent">Premium</div>
            {plan ? (
              <div className="mt-2 text-3xl font-black">{t("premium.price", { amount: plan.amount })}</div>
            ) : (
              <div className="skeleton mt-2 h-9 w-40 rounded" />
            )}
            {plan?.test ? (
              <div className="mt-1 text-xs font-semibold text-warning">{t("premium.test")}</div>
            ) : null}
            <ul className="mt-5 space-y-2 text-sm">
              {benefits.slice(0, 3).map((b) => (
                <li key={b.text} className="flex items-center gap-2">
                  <Check className="size-4 text-accent" /> {b.text}
                </li>
              ))}
            </ul>
            <div className="mt-6">
              {!me ? (
                <Button variant="accent" size="lg" className="w-full" asChild>
                  <Link href="/login?next=/premium">{t("common.signIn")}</Link>
                </Button>
              ) : sub.data?.active ? (
                <div className="space-y-3">
                  <p className="rounded-lg bg-success/15 p-3 text-sm font-semibold text-success">
                    {sub.data.cancelAtPeriodEnd
                      ? t("premium.canceled", { date: fmt(sub.data.until!) })
                      : t("premium.active", { date: fmt(sub.data.until!) })}
                  </p>
                  {!sub.data.cancelAtPeriodEnd ? (
                    <Button
                      variant="ghost"
                      className="w-full"
                      onClick={async () => {
                        await api.premium.cancel();
                        await invalidate(qc, endpoints.premium.subscription);
                      }}
                    >
                      {t("premium.cancel")}
                    </Button>
                  ) : null}
                </div>
              ) : (
                <Button
                  variant="accent"
                  size="lg"
                  className="w-full"
                  loading={busy}
                  disabled={!plan || !plans.data?.paymentsEnabled}
                  onClick={checkout}
                >
                  {plans.data?.paymentsEnabled === false
                    ? t("premium.disabled")
                    : t("premium.subscribe", { amount: plan?.amount ?? 1 })}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
