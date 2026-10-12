"use client";
/**
 * Вхід у застосунок N'Owl для Windows: застосунок відкриває цю сторінку в системному браузері (Google
 * не пускає вхід у вбудованих вікнах). Без входу — на /login, після — одноразовий код і повернення
 * в застосунок посиланням nowl://auth?code=….
 */
import { useMe } from "@musicdb/sdk/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Logo } from "@/components/shell/logo";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";

export function DesktopLogin() {
  const { locale } = useI18n();
  const uk = locale === "uk";
  const me = useMe();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState(false);

  /** Кожне відкриття — новий одноразовий код (повторне натискання не має «згорілого» коду). */
  const openApp = async () => {
    try {
      const r = await fetch("/v1/desktop/code", { method: "POST", credentials: "same-origin" });
      if (!r.ok) throw new Error(String(r.status));
      const { code } = (await r.json()) as { code: string };
      setError(false);
      setReady(true);
      location.href = `nowl://auth?code=${code}`;
    } catch {
      setError(true);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: код запитуємо один раз — після того, як стало відомо про вхід
  useEffect(() => {
    if (me.isLoading) return;
    if (!me.data) {
      router.replace("/login?next=/desktop-login");
      return;
    }
    void openApp();
  }, [me.isLoading, me.data, router]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-bg p-6 text-center">
      <Logo className="h-12" withText={false} />
      <h1 className="serif-title text-3xl">
        {error
          ? uk
            ? "Не вдалося увійти в застосунок"
            : "Couldn't sign in to the app"
          : uk
            ? "Повертаємось у застосунок N'Owl…"
            : "Returning to the N'Owl app…"}
      </h1>
      <p className="max-w-md text-muted">
        {error
          ? uk
            ? "Оновіть сторінку або натисніть «Продовжити з Google» у застосунку ще раз."
            : "Reload the page or tap “Continue with Google” in the app again."
          : uk
            ? "Якщо браузер спитає, дозвольте відкрити N'Owl. Цю вкладку потім можна закрити."
            : "If the browser asks, allow it to open N'Owl. You can close this tab afterwards."}
      </p>
      {ready || error ? (
        <Button variant="accent" size="lg" onClick={() => void openApp()}>
          {uk ? "Відкрити застосунок" : "Open the app"}
        </Button>
      ) : null}
    </main>
  );
}
