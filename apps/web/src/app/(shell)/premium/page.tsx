import { FEATURES } from "@musicdb/tokens";
import { notFound } from "next/navigation";
import { PremiumView } from "@/components/pages/premium";
import { serverApi } from "@/lib/server";

export const metadata = { title: "Premium" };

export default async function PremiumPage() {
  if (FEATURES.premium) return <PremiumView />;
  // Підписку сховано (FEATURES.premium), поки її не запущено; адміни бачать — щоб перевірити оплату.
  const me = await (await serverApi()).me.get().catch(() => null);
  if (me?.role !== "admin") notFound();
  return <PremiumView preview />;
}
