import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "N'Owl",
    short_name: "N'Owl",
    description: "Музика, що знаходить тебе",
    start_url: "/",
    display: "standalone",
    background_color: "#090c14",
    theme_color: "#090c14",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon.png", sizes: "256x256", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
