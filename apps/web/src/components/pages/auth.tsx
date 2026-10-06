"use client";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { type FormEvent, useState } from "react";
import { Logo } from "@/components/shell/logo";
import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { useT } from "@/lib/i18n";

export function AuthForm({ mode }: { mode: "login" | "signup" }) {
  const t = useT();
  const router = useRouter();
  const params = useSearchParams();
  const qc = useQueryClient();
  const next = params.get("next")?.startsWith("/") ? params.get("next")! : "/";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const done = async () => {
    await qc.invalidateQueries();
    router.replace(next);
    router.refresh();
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res =
      mode === "login"
        ? await authClient.signIn.email({ email, password })
        : await authClient.signUp.email({ email, password, name: name.trim() || email.split("@")[0]! });
    setBusy(false);
    if (res.error) {
      setError(mode === "login" ? t("auth.invalid") : (res.error.message ?? t("errors.generic")));
      return;
    }
    await done();
  };

  const google = async () => {
    setError(null);
    const res = await authClient.signIn.social({
      provider: "google",
      callbackURL: `${location.origin}${next}`,
    });
    if (res?.error) setError(res.error.message ?? t("errors.generic"));
  };

  return (
    <main className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-bg p-4">
      <div className="pointer-events-none absolute -top-40 left-1/2 size-[600px] -translate-x-1/2 rounded-full bg-accent/15 blur-[120px]" />
      <div className="relative w-full max-w-[420px] animate-rise rounded-2xl bg-surface-1 p-8 shadow-2xl ring-1 ring-line sm:p-10">
        <Link href="/" className="mb-8 flex justify-center">
          <Logo className="h-10" />
        </Link>
        <h1 className="text-center serif-title text-3xl">
          {mode === "login" ? t("auth.title") : t("common.signUp")}
        </h1>
        <p className="mt-2 text-center text-sm text-muted">{t("auth.subtitle")}</p>

        <Button variant="outline" size="lg" className="mt-8 w-full" onClick={google}>
          <GoogleIcon /> {t("auth.continueGoogle")}
        </Button>

        <div className="my-6 flex items-center gap-3 text-xs text-subtle">
          <span className="h-px flex-1 bg-line" />
          {t("common.or")}
          <span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={submit} className="space-y-4">
          {mode === "signup" ? (
            <Field label={t("auth.name")} value={name} onChange={setName} autoComplete="name" />
          ) : null}
          <Field
            label={t("auth.email")}
            type="email"
            value={email}
            onChange={setEmail}
            autoComplete="email"
            required
          />
          <Field
            label={t("auth.password")}
            type="password"
            value={password}
            onChange={setPassword}
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            required
            minLength={mode === "signup" ? 8 : 1}
          />
          {error ? (
            <p role="alert" className="rounded-md bg-danger/15 px-3 py-2 text-sm text-danger">
              {error}
            </p>
          ) : null}
          <Button type="submit" variant="accent" size="lg" className="w-full" loading={busy}>
            {mode === "login" ? t("common.signIn") : t("common.signUp")}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted">
          {mode === "login" ? t("auth.noAccount") : t("auth.haveAccount")}{" "}
          <Link
            href={`${mode === "login" ? "/signup" : "/login"}?next=${encodeURIComponent(next)}`}
            className="font-bold text-fg underline-offset-2 hover:underline"
          >
            {mode === "login" ? t("common.signUp") : t("common.signIn")}
          </Link>
        </p>
        <p className="mt-6 text-center text-xs text-subtle">
          <Link href="/legal/terms" className="hover:underline">
            {t("auth.terms")}
          </Link>
        </p>
      </div>
    </main>
  );
}

function Field({
  label,
  value,
  onChange,
  ...props
}: { label: string; value: string; onChange: (v: string) => void } & Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "value" | "onChange"
>) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-bold">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-12 w-full rounded-md border border-line-strong bg-surface-2 px-4 text-[15px] transition-colors outline-none hover:border-fg/50 focus:border-fg"
        {...props}
      />
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
      <path
        fill="#4285F4"
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.27-4.74 3.27-8.1z"
      />
      <path
        fill="#34A853"
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84A11 11 0 0 0 12 23z"
      />
      <path
        fill="#FBBC05"
        d="M5.84 14.1A6.6 6.6 0 0 1 5.5 12c0-.73.13-1.44.34-2.1V7.07H2.18A11 11 0 0 0 1 12c0 1.78.43 3.45 1.18 4.93l3.66-2.83z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15A10.6 10.6 0 0 0 12 1 11 11 0 0 0 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"
      />
    </svg>
  );
}
