"use client";
import type { ReportReason, ReportTarget } from "@musicdb/contracts/client";
import { useApi } from "@musicdb/sdk/react";
import { useState } from "react";
import { toast } from "sonner";
import { create } from "zustand";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { useT } from "@/lib/i18n";

type Target = { targetType: ReportTarget; targetId: string };

const useReportStore = create<{ target: Target | null; set(t: Target | null): void }>()((set) => ({
  target: null,
  set: (target) => set({ target }),
}));

export function useReportDialog() {
  const set = useReportStore((s) => s.set);
  return { open: (target: Target) => set(target) };
}

const reasons: ReportReason[] = [
  "spam",
  "harassment",
  "hate",
  "sexual",
  "violence",
  "copyright",
  "impersonation",
  "misinformation",
  "other",
];

/** Один діалог скарги на весь застосунок (вимога Google Play для UGC). */
export function ReportDialog() {
  const t = useT();
  const api = useApi();
  const { target, set } = useReportStore();
  const [reason, setReason] = useState<ReportReason>("spam");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await api.reports.create({
        body: { ...target, reason, ...(details.trim() ? { details: details.trim() } : {}) },
      });
      toast(t("report.sent"));
      set(null);
      setDetails("");
    } catch {
      toast.error(t("errors.generic"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && set(null)} title={t("report.title")}>
      <fieldset className="space-y-1">
        <legend className="mb-2 text-sm font-bold">{t("report.reason")}</legend>
        {reasons.map((r) => (
          <label
            key={r}
            className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-surface-3"
          >
            <input
              type="radio"
              name="reason"
              checked={reason === r}
              onChange={() => setReason(r)}
              className="accent-[var(--n-accent)]"
            />
            <span className="text-sm">{t(`report.reasons.${r}`)}</span>
          </label>
        ))}
      </fieldset>
      <label className="mt-4 block">
        <span className="mb-1.5 block text-sm font-bold">{t("report.details")}</span>
        <textarea
          value={details}
          onChange={(e) => setDetails(e.target.value)}
          maxLength={2000}
          rows={3}
          className="w-full resize-none rounded-md bg-surface-3 p-3 text-sm outline-none focus:ring-2 focus:ring-accent"
        />
      </label>
      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={() => set(null)}>
          {t("common.cancel")}
        </Button>
        <Button variant="accent" onClick={submit} loading={busy}>
          {t("common.send")}
        </Button>
      </div>
    </Dialog>
  );
}
