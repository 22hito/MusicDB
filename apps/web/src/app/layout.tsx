import { normalizeAccent, themeCss } from "@musicdb/tokens";
import type { Metadata, Viewport } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { cookies } from "next/headers";
import type { ReactNode } from "react";
import { Providers } from "@/components/providers";
import { getLocale } from "@/lib/server";
import "./globals.css";

const inter = Inter({ subsets: ["latin", "cyrillic"], variable: "--font-inter", display: "swap" });
const playfair = Playfair_Display({
  subsets: ["latin", "cyrillic"],
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.PUBLIC_URL ?? "http://localhost:3000"),
  title: { default: "N'Owl", template: "%s · N'Owl" },
  description: "Слухайте музику, відкривайте незалежних артистів, оцінюйте й обговорюйте.",
  applicationName: "N'Owl",
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }, { url: "/icon.png" }],
    apple: "/icon-512.png",
  },
  manifest: "/manifest.webmanifest",
  openGraph: { siteName: "N'Owl", type: "website" },
};

export const viewport: Viewport = {
  themeColor: "#090c14",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

const css = themeCss();

export default async function RootLayout({ children }: { children: ReactNode }) {
  const jar = await cookies();
  const locale = await getLocale();
  const theme = jar.get("nowl-theme")?.value;
  const accent = jar.get("nowl-accent")?.value;
  const motion = jar.get("nowl-motion")?.value;
  return (
    <html
      lang={locale}
      data-theme={theme === "gray" || theme === "light" || theme === "system" ? theme : "dark"}
      data-accent={normalizeAccent(accent)}
      data-motion={motion === "full" || motion === "reduced" ? motion : "system"}
      className={`${inter.variable} ${playfair.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: статичні токени дизайну з нашого пакета */}
        <style id="nowl-tokens" dangerouslySetInnerHTML={{ __html: css }} />
      </head>
      <body>
        <Providers locale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
