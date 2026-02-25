import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/acquire/",
          "/operate/",
          "/pro/",
          "/api/",
          "/auth/",
        ],
      },
    ],
    sitemap: "https://www.assetatlaspro.com/sitemap.xml",
  };
}
