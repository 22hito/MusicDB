import type { Translate } from "@musicdb/i18n";
import { Alert } from "react-native";
import { playList } from "@/components/music";
import { api } from "./api";

/** Рівень сумісності смаків (як на Last.fm): за відсотком збігу. */
export function tasteTier(match: number, t: Translate) {
  if (match >= 75) return { label: t("taste.tierSuper"), tone: "accent" as const };
  if (match >= 50) return { label: t("taste.tierHigh"), tone: "success" as const };
  if (match >= 25) return { label: t("taste.tierMedium"), tone: "text2" as const };
  return { label: t("taste.tierLow"), tone: "textMuted" as const };
}

/** «Слухати спільне»: пісні, які подобаються або слухаються і вам, і цій людині (перемішано). */
export async function playCommon(userId: string, name: string, t: Translate) {
  const res = await api.users.common({ params: { id: userId } });
  if (!res.items.length) return Alert.alert(t("taste.commonEmpty"));
  const shuffled = [...res.items].sort(() => Math.random() - 0.5);
  playList(shuffled, 0, { type: "profile", id: userId, name: `${t("taste.playCommon")} · ${name}` });
}
