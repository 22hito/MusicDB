import type { Translate } from "@musicdb/i18n";
import {
  ChartColumn,
  Clock3,
  Compass,
  FerrisWheel,
  Home,
  type LucideIcon,
  Mic2,
  Sparkles,
  Swords,
  Table2,
  Trophy,
  Users,
} from "lucide-react";

type T = Translate;

export type NavItem = { href: string; label: string; icon: LucideIcon; match: (path: string) => boolean };

/** Основні розділи (бічна панель). Сторінки з v1 — тут, щоб були під рукою, а не сховані в меню. */
export function mainNav(t: T): NavItem[] {
  return [
    { href: "/", label: t("nav.home"), icon: Home, match: (p) => p === "/" },
    { href: "/explore", label: t("nav.explore"), icon: Compass, match: (p) => p === "/explore" },
    { href: "/top", label: t("nav.top"), icon: Trophy, match: (p) => p.startsWith("/top") },
    { href: "/catalog", label: t("nav.catalog"), icon: Table2, match: (p) => p.startsWith("/catalog") },
    { href: "/wheel", label: t("nav.wheel"), icon: FerrisWheel, match: (p) => p.startsWith("/wheel") },
    { href: "/battle", label: t("nav.battle"), icon: Swords, match: (p) => p.startsWith("/battle") },
    {
      href: "/time-machine",
      label: t("nav.timeMachine"),
      icon: Clock3,
      match: (p) => p.startsWith("/time-machine"),
    },
    { href: "/community", label: t("nav.community"), icon: Users, match: (p) => p.startsWith("/community") },
  ];
}

/** Плитки хабу «Що послухати». */
export function exploreTiles(t: T) {
  return [
    { href: "/wheel", title: t("nav.wheel"), sub: t("explore.wheelSub"), icon: FerrisWheel },
    { href: "/battle", title: t("nav.battle"), sub: t("explore.battleSub"), icon: Swords },
    { href: "/top", title: t("nav.top"), sub: t("explore.topSub"), icon: Trophy },
    { href: "/taste", title: t("nav.taste"), sub: t("explore.tasteSub"), icon: Users },
    { href: "/recommendations", title: t("nav.recommendations"), sub: t("explore.recSub"), icon: Sparkles },
    { href: "/artists", title: t("nav.artists"), sub: t("explore.artistsSub"), icon: Mic2 },
    { href: "/time-machine", title: t("nav.timeMachine"), sub: t("explore.timeSub"), icon: Clock3 },
    { href: "/stats", title: t("nav.stats"), sub: t("explore.statsSub"), icon: ChartColumn },
    { href: "/catalog", title: t("nav.catalog"), sub: t("explore.catalogSub"), icon: Table2 },
  ];
}
