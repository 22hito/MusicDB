"use client";
/** Підказки у формі заявки: поки людина вводить назву чи виконавця — офіційні записи й пісні, що вже є в каталозі. */
import { endpoints, type TrackLookupItem } from "@musicdb/contracts/client";
import { useEndpoint } from "@musicdb/sdk/react";
import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Cover } from "@/components/ui/cover";
import { useI18n } from "@/lib/i18n";

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setV(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return v;
}

export function SubmissionSuggestions({
  query,
  onPick,
}: {
  /** Виконавець + назва з форми; порожньо — панель прихована. */
  query: string;
  onPick: (item: TrackLookupItem) => void;
}) {
  const { t } = useI18n();
  const q = useDebounced(query.trim(), 400);
  const enabled = q.length >= 2;
  const res = useEndpoint(endpoints.submissions.lookup, { query: { q } }, { enabled, staleTime: 60_000 });
  if (!enabled || query.trim().length < 2) return null;
  const items = res.data?.items ?? [];
  const existing = res.data?.existing ?? [];
  const loading = res.isFetching && !res.data;

  return (
    <div className="space-y-3 rounded-lg bg-surface-2/60 p-3 sm:col-span-2">
      {existing.length ? (
        <div>
          <div className="mb-1.5 text-xs font-bold text-muted">{t("upload.alreadyInCatalog")}</div>
          <ul className="space-y-1">
            {existing.map((tr) => (
              <li key={tr.id}>
                <Link
                  href={`/track/${tr.id}`}
                  className="flex items-center gap-3 rounded-md p-1.5 transition hover:bg-surface-3"
                >
                  <Cover
                    src={tr.release?.coverUrl}
                    alt=""
                    size={40}
                    seed={tr.id}
                    className="size-10 shrink-0"
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{tr.title}</span>
                    <span className="block truncate text-xs text-muted">
                      {tr.artists.map((a) => a.name).join(", ")}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div>
        <div className="mb-1.5 flex items-center gap-2 text-xs font-bold text-muted">
          {loading ? (
            <>
              <Loader2 className="size-3.5 animate-spin" /> {t("upload.searching")}
            </>
          ) : items.length ? (
            t("upload.suggestions")
          ) : (
            t("upload.noSuggestions")
          )}
        </div>
        {items.length ? (
          <ul className="space-y-1">
            {items.map((it) => (
              <li key={`${it.source}|${it.title}|${it.artists.join(",")}|${it.album ?? ""}`}>
                <button
                  type="button"
                  onClick={() => onPick(it)}
                  className="flex w-full items-center gap-3 rounded-md p-1.5 text-left transition hover:bg-surface-3"
                >
                  <Cover
                    src={it.coverUrl}
                    alt=""
                    size={40}
                    seed={`${it.title}${it.artists[0] ?? ""}`}
                    className="size-10 shrink-0"
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">
                      {it.title}
                      {it.explicit ? <span className="ml-1.5 text-[10px] text-muted">E</span> : null}
                    </span>
                    <span className="block truncate text-xs text-muted">
                      {[it.artists.join(", "), it.album, it.releaseDate?.slice(0, 4)]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}
