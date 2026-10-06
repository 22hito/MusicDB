import { resolve } from "node:path";
import type { NextConfig } from "next";

const apiOrigin = process.env.API_INTERNAL_URL ?? "http://localhost:8787";

const config: NextConfig = {
  reactStrictMode: true,
  // Самодостатня збірка для Docker; корінь трасування — монорепо (спільні пакети).
  output: "standalone",
  outputFileTracingRoot: resolve(import.meta.dirname, "../.."),
  agentRules: false,
  poweredByHeader: false,
  transpilePackages: [
    "@musicdb/contracts",
    "@musicdb/sdk",
    "@musicdb/player",
    "@musicdb/tokens",
    "@musicdb/i18n",
  ],
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
    return [{ source: "/v1/:path*", destination: `${apiOrigin}/v1/:path*` }];
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
