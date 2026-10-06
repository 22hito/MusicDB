import { FEATURES } from "@musicdb/tokens";
import { notFound } from "next/navigation";
import { PremiumView } from "@/components/pages/premium";

export const metadata = { title: "Premium" };

export default function PremiumPage() {
  // Підписку сховано (FEATURES.premium), поки немає платіжного провайдера.
  if (!FEATURES.premium) notFound();
  return <PremiumView />;
}
