"use client";
import { useBadges, useMe } from "@musicdb/sdk/react";
import { FEATURES } from "@musicdb/tokens";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, Crown, LogOut, MessageCircle, Search, Settings, Shield, Upload, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useEffect, useRef, useState } from "react";
import { Button, IconButton } from "@/components/ui/button";
import { confirm } from "@/components/ui/confirm";
import { Avatar } from "@/components/ui/cover";
import { DropdownMenu } from "@/components/ui/menu";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/cn";
import { useT } from "@/lib/i18n";
import { Logo } from "./logo";

export function TopBar({ scrolled }: { scrolled: boolean }) {
  const t = useT();
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const me = useMe().data;
  const badges = useBadges().data;
  const qc = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState(pathname === "/search" ? (params.get("q") ?? "") : "");

  useEffect(() => {
    if (pathname !== "/search") setQ("");
  }, [pathname]);

  // Ctrl/Cmd+K — до пошуку.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && (e.key === "k" || e.key === "л")) {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const onChange = (value: string) => {
    setQ(value);
    const target = value.trim() ? `/search?q=${encodeURIComponent(value.trim())}` : "/search";
    if (pathname === "/search") router.replace(target, { scroll: false });
    else router.push(target);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    onChange(q);
  };

  const signOut = async () => {
    if (!(await confirm({ title: t("confirm.signOut"), confirmLabel: t("common.signOut") }))) return;
    await authClient.signOut();
    qc.clear();
    router.push("/");
    router.refresh();
  };

  return (
    <div
      className={cn(
        "flex h-16 items-center gap-3 px-4 transition-colors duration-300 sm:px-6",
        scrolled && "bg-bg/80 backdrop-blur-md",
      )}
    >
      {/* На телефоні логотип — тут; на комп'ютері він у бічній панелі. */}
      <Link href="/" className="shrink-0 px-1 md:hidden" aria-label="N'Owl">
        <Logo className="h-7" withText={false} />
      </Link>

      <div className="flex w-full max-w-[460px] items-center gap-2">
        <form onSubmit={onSubmit} role="search" className="group relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3.5 z-10 size-[18px] -translate-y-1/2 text-subtle group-focus-within:text-accent" />
          <input
            ref={inputRef}
            value={q}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => pathname !== "/search" && router.prefetch("/search")}
            placeholder={t("search.placeholder")}
            aria-label={t("common.search")}
            className="h-11 w-full rounded-xl border border-line/80 bg-surface-1/70 pr-16 pl-11 text-[14.5px] text-fg backdrop-blur transition-colors outline-none placeholder:text-subtle hover:border-line-strong focus:border-accent focus:bg-surface-1"
          />
          {!q ? (
            <kbd className="pointer-events-none absolute top-1/2 right-3 hidden -translate-y-1/2 rounded-md border border-line px-1.5 py-0.5 font-sans text-[10px] text-subtle sm:block">
              Ctrl K
            </kbd>
          ) : null}
          {q ? (
            <button
              type="button"
              aria-label={t("common.close")}
              onClick={() => onChange("")}
              className="absolute top-1/2 right-3 -translate-y-1/2 text-muted hover:text-fg"
            >
              <X className="size-5" />
            </button>
          ) : null}
        </form>
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-1">
        {me ? (
          <>
            <IconButton
              label={t("nav.upload")}
              onClick={() => router.push("/upload")}
              className="hidden lg:inline-flex"
            >
              <Upload className="size-5" />
            </IconButton>
            <BadgeLink
              href="/messages"
              label={t("nav.messages")}
              count={(badges?.messages ?? 0) + (badges?.messageRequests ?? 0)}
            >
              <MessageCircle className="size-5" />
            </BadgeLink>
            <BadgeLink
              href="/notifications"
              label={t("nav.notifications")}
              count={badges?.notifications ?? 0}
            >
              <Bell className="size-5" />
            </BadgeLink>
            <DropdownMenu
              items={[
                {
                  label: t("nav.profile"),
                  icon: <User />,
                  onSelect: () => router.push(`/user/${me.username ?? me.id}`),
                },
                { label: t("nav.upload"), icon: <Upload />, onSelect: () => router.push("/upload") },
                ...(FEATURES.premium
                  ? [{ label: t("nav.premium"), icon: <Crown />, onSelect: () => router.push("/premium") }]
                  : []),
                ...(me.role === "admin" || me.role === "moderator"
                  ? [{ label: t("nav.admin"), icon: <Shield />, onSelect: () => router.push("/admin") }]
                  : []),
                { label: t("nav.settings"), icon: <Settings />, onSelect: () => router.push("/settings") },
                { type: "separator" as const },
                { label: t("common.signOut"), icon: <LogOut />, onSelect: signOut },
              ]}
              trigger={
                <button
                  type="button"
                  aria-label={me.name}
                  className="ml-1 rounded-full bg-surface-2 p-1 transition hover:scale-105"
                >
                  <Avatar src={me.image} name={me.name} size={32} />
                </button>
              }
            />
          </>
        ) : (
          <>
            <Button variant="ghost" className="hidden sm:inline-flex" onClick={() => router.push("/signup")}>
              {t("common.signUp")}
            </Button>
            <Button size="md" onClick={() => router.push(`/login?next=${encodeURIComponent(pathname)}`)}>
              {t("common.signIn")}
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function BadgeLink({
  href,
  label,
  count,
  children,
}: {
  href: string;
  label: string;
  count: number;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={count ? `${label} (${count})` : label}
      title={label}
      className="relative inline-flex size-10 items-center justify-center rounded-full text-muted transition hover:scale-105 hover:text-fg"
    >
      {children}
      {count > 0 ? (
        <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-on-accent">
          {count > 99 ? "99+" : count}
        </span>
      ) : null}
    </Link>
  );
}
