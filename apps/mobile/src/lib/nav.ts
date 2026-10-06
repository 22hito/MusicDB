import type { Translate } from "@musicdb/i18n";
import {
  ChartColumn,
  Clock3,
  FerrisWheel,
  type LucideIcon,
  Mic2,
  Sparkles,
  Swords,
  Table2,
  Trophy,
  Users,
} from "lucide-react-native";

export type ExploreTile = { href: string; title: string; sub: string; icon: LucideIcon };

/** Плитки «Що послухати» — ті самі, що на сайті. */
export function exploreTiles(t: Translate): ExploreTile[] {
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
