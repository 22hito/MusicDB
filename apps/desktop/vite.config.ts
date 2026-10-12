/**
 * Інтерфейс застосунку: ті самі сторінки, плеєр і стилі, що й на сайті (apps/web/src), без Next —
 * навігація через react-router, next/link і next/navigation підмінені тонкими обгортками.
 */
import { createRequire } from "node:module";
import { dirname, resolve } from "node:path";
import tailwind from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const here = import.meta.dirname;
const web = resolve(here, "../web");
// Один екземпляр React і бібліотек зі станом — той, що й у коду сайту (інакше хуки ламаються).
const fromWeb = createRequire(resolve(web, "package.json"));
const pkgDir = (name: string) => dirname(fromWeb.resolve(`${name}/package.json`));

export default defineConfig({
  root: resolve(here, "src/renderer"),
  base: "./",
  publicDir: resolve(web, "public"),
  plugins: [react(), tailwind()],
  resolve: {
    alias: [
      { find: /^@\/lib\/auth-client$/, replacement: resolve(here, "src/renderer/shims/auth-client.ts") },
      { find: /^@\//, replacement: `${resolve(web, "src")}/` },
      { find: /^next\/link$/, replacement: resolve(here, "src/renderer/shims/next-link.tsx") },
      { find: /^next\/navigation$/, replacement: resolve(here, "src/renderer/shims/next-navigation.ts") },
      { find: /^react$/, replacement: pkgDir("react") },
      { find: /^react-dom$/, replacement: pkgDir("react-dom") },
      { find: /^react\/(.*)$/, replacement: `${pkgDir("react")}/$1` },
      { find: /^react-dom\/(.*)$/, replacement: `${pkgDir("react-dom")}/$1` },
      { find: /^@tanstack\/react-query$/, replacement: pkgDir("@tanstack/react-query") },
      { find: /^zustand$/, replacement: pkgDir("zustand") },
      { find: /^better-auth\/react$/, replacement: fromWeb.resolve("better-auth/react") },
    ],
    dedupe: ["react", "react-dom", "@tanstack/react-query", "zustand"],
  },
  define: {
    // Без WebSocket — як на Vercel: оновлення опитуванням.
    "process.env.NEXT_PUBLIC_REALTIME": JSON.stringify("off"),
    "process.env.NEXT_PUBLIC_REALTIME_URL": "undefined",
    "process.env.NEXT_PUBLIC_LEGAL_EMAIL": "undefined",
    "process.env.API_INTERNAL_URL": "undefined",
  },
  build: {
    outDir: resolve(here, "out/renderer"),
    emptyOutDir: true,
    target: "chrome140",
    chunkSizeWarningLimit: 4000,
  },
});
