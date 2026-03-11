import type { MetadataRoute } from "next";
import { createServiceClient } from "@/lib/supabase/server";
import { buildCitySlug } from "@/lib/vendor/directory-utils";

const baseUrl = "https://www.assetatlaspro.com";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: "monthly", priority: 1 },
    { url: `${baseUrl}/login`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.5 },
    { url: `${baseUrl}/signup`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.8 },
    { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
    { url: `${baseUrl}/vendors`, lastModified: new Date(), changeFrequency: "daily", priority: 0.9 },
  ];

  let supabase;
  try {
    supabase = createServiceClient();
  } catch {
    // Service key not available (build time) — return static pages only
    return staticPages;
  }

  // Qualified vendors
  const { data: vendors } = await supabase
    .from("vendor_organizations")
    .select("slug, city, state, trades, updated_at")
    .eq("status", "active")
    .eq("booking_enabled", true)
    .not("slug", "is", null)
    .not("city", "is", null)
    .not("state", "is", null)
    .not("name", "is", null);

  const qualified = (vendors ?? []).filter((v) => v.trades && v.trades.length > 0);

  // Booking + profile pages per vendor
  const vendorPages: MetadataRoute.Sitemap = qualified.flatMap((v) => [
    {
      url: `${baseUrl}/book/${v.slug}`,
      lastModified: new Date(v.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/vendors/${v.slug}`,
      lastModified: new Date(v.updated_at),
      changeFrequency: "weekly" as const,
      priority: 0.7,
    },
  ]);

  // City+trade combos with 3+ vendors
  const comboMap = new Map<string, { trade: string; city: string; state: string; count: number }>();
  for (const v of qualified) {
    for (const trade of v.trades) {
      const key = `${trade}::${v.city.toLowerCase()}::${v.state.toLowerCase()}`;
      const existing = comboMap.get(key);
      if (existing) existing.count++;
      else comboMap.set(key, { trade, city: v.city, state: v.state, count: 1 });
    }
  }

  const landingPages: MetadataRoute.Sitemap = Array.from(comboMap.values())
    .filter((c) => c.count >= 3)
    .map((c) => ({
      url: `${baseUrl}/vendors/${c.trade}/${buildCitySlug(c.city, c.state)}`,
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));

  return [...staticPages, ...vendorPages, ...landingPages];
}
