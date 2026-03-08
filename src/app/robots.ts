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
          "/vendor/",
          "/pro/",
          "/home/",
          "/home-onboarding/",
          "/vendor-onboarding/",
          "/pro-onboarding/",
          "/dashboard/",
          "/api/",
          "/auth/",
          "/track/",
        ],
      },
    ],
    sitemap: "https://www.assetatlaspro.com/sitemap.xml",
  };
}
