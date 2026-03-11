import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Asset Atlas Pro",
    short_name: "Asset Atlas",
    description: "Real estate operations platform — acquisitions, property management, contractor tools, and homeowner services.",
    start_url: "/",
    display: "standalone",
    background_color: "#141414",
    theme_color: "#1a3a2a",
    orientation: "portrait-primary",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
