import { resolve } from "node:path";
import type { NextConfig } from "next";

const apiOrigin = process.env.API_INTERNAL_URL ?? "http://localhost:8787";
/** На Vercel API працює всередині сайту (app/v1/[...path]/route.ts), без окремого сервера. */
const embeddedApi = !!process.env.EMBEDDED_API;

const config: NextConfig = {
  reactStrictMode: true,
  // Самодостатня збірка для Docker; корінь трасування — монорепо (спільні пакети).
  output: "standalone",
  outputFileTracingRoot: resolve(import.meta.dirname, "../.."),
  agentRules: false,
  poweredByHeader: false,
  transpilePackages: [
    "@musicdb/api",
    "@musicdb/db",
    "@musicdb/contracts",
    "@musicdb/sdk",
    "@musicdb/player",
    "@musicdb/tokens",
    "@musicdb/i18n",
  ],
  // Пакети API з нативними файлами чи воркерами — не бандлити (ffmpeg-static — бінарник, pino — потоки).
  serverExternalPackages: ["ffmpeg-static", "pino", "thread-stream", "pino-pretty"],
  outputFileTracingIncludes: {
    "/v1/[...path]": ["../../node_modules/.pnpm/ffmpeg-static@*/node_modules/ffmpeg-static/ffmpeg*"],
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "radix-ui"],
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "cdn-images.dzcdn.net" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "i.ytimg.com" },
      { protocol: "http", hostname: "localhost" },
    ],
  },
  // Один origin для сайту й API: cookie-сесія, OAuth-колбеки й підписані посилання без CORS.
  async rewrites() {
    if (embeddedApi) return [];
    // beforeFiles — щоб проксі мав пріоритет над вбудованим маршрутом app/v1 у розробці й Docker.
    return {
      beforeFiles: [{ source: "/v1/:path*", destination: `${apiOrigin}/v1/:path*` }],
      afterFiles: [],
      fallback: [],
    };
  },
  // Сторінки v1 → відповідники v2 (старі закладки й посилання не ламаються).
  async redirects() {
    return [
      // /top, /explore, /wheel, /battle, /taste, /artists, /recommendations — є й у v2.
      { source: "/charts", destination: "/top", permanent: false },
      { source: "/graph", destination: "/time-machine", permanent: false },
      { source: "/background", destination: "/catalog?source=background", permanent: true },
      { source: "/request", destination: "/upload", permanent: true },
      { source: "/profile", destination: "/library", permanent: true },
      { source: "/profile/settings", destination: "/settings", permanent: true },
      { source: "/friends", destination: "/community", permanent: true },
      { source: "/chat", destination: "/community", permanent: true },
      { source: "/chat/threads", destination: "/community", permanent: true },
      { source: "/chat/friends", destination: "/community", permanent: true },
      { source: "/chat/dm", destination: "/messages", permanent: true },
      { source: "/chat/requests", destination: "/messages", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default config;
