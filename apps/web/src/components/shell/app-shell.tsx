"use client";
/**
 * Оболонка застосунку N'Owl: суцільна бічна панель (логотип, розділи, бібліотека), вміст на всю площу
 * з «сяйвом» обкладинки, права панель (зараз грає / черга / текст) і плаваючий док плеєра внизу.
 * На телефоні — нижня навігація, міні-плеєр і повноекранний плеєр. Плеєр і відео живуть тут,
 * тож переходи між сторінками не переривають музику.
 */
import { usePathname } from "next/navigation";
import { type ReactNode, Suspense, useEffect, useState } from "react";
import { cn } from "@/lib/cn";
import { ScrollProvider } from "@/lib/scroll";
import { useUi } from "@/lib/ui-store";
import { PlayerEngine } from "@/player/engine";
import { usePlayer } from "@/player/store";
import { Aurora } from "./aurora";
import { FullPlayer, MiniPlayer, MobileNav } from "./mobile";
import { PlayerDock } from "./player-bar";
import { RightPanel } from "./right-panel";
import { Sidebar } from "./sidebar";
import { TopBar } from "./topbar";

export function AppShell({ children }: { children: ReactNode }) {
  const [scrollEl, setScrollEl] = useState<HTMLElement | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const collapsed = useUi((s) => s.sidebarCollapsed);
  const rightPanel = useUi((s) => s.rightPanel);
  const hasTrack = usePlayer((s) => !!s.current);
  const showRight = !!rightPanel && (hasTrack || rightPanel === "queue");

  useEffect(() => {
    if (!scrollEl) return;
    const onScroll = () => setScrolled(scrollEl.scrollTop > 8);
    scrollEl.addEventListener("scroll", onScroll, { passive: true });
    return () => scrollEl.removeEventListener("scroll", onScroll);
  }, [scrollEl]);

  // Нова сторінка — прокрутка на початок.
  // biome-ignore lint/correctness/useExhaustiveDependencies: реагуємо саме на зміну шляху
  useEffect(() => {
    scrollEl?.scrollTo({ top: 0 });
  }, [pathname]);

  return (
    <div
      className="fixed inset-0 flex bg-bg"
      style={
        {
          "--sidebar-w": collapsed ? "76px" : "268px",
          "--right-w": showRight ? "360px" : "0px",
        } as React.CSSProperties
      }
    >
      <div className="hidden w-[var(--sidebar-w)] shrink-0 border-r border-line/70 bg-surface-1/50 transition-[width] duration-300 ease-[var(--ease-out-expo)] md:block">
        <Sidebar />
      </div>
      <main className="relative isolate min-w-0 flex-1 overflow-hidden">
        <Aurora />
        <div className="absolute inset-x-0 top-0 z-20">
          <Suspense>
            <TopBar scrolled={scrolled} />
          </Suspense>
        </div>
        <div
          ref={setScrollEl}
          className="scroll-area relative z-10 h-full overflow-x-hidden overflow-y-auto"
          id="main-scroll"
        >
          <ScrollProvider element={scrollEl}>
            {/* Новий шлях — нова сторінка з'являється з легким підйомом. */}
            <div key={pathname} className="page-enter min-h-full pt-16 pb-40 md:pb-32">
              {children}
            </div>
          </ScrollProvider>
        </div>
      </main>
      <div
        className={cn(
          "hidden shrink-0 border-l border-line/70 bg-surface-1/50 xl:block",
          showRight ? "w-[var(--right-w)]" : "w-0 border-l-0",
        )}
      >
        {showRight ? <RightPanel panel={rightPanel} /> : null}
      </div>

      <div className="hidden md:block">
        <PlayerDock />
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 md:hidden">
        <MiniPlayer />
        <MobileNav />
      </div>

      <FullPlayer />
      <PlayerEngine />
    </div>
  );
}
