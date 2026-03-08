import { Suspense } from "react";
import type { Metadata } from "next";
import { getDirectoryVendors } from "./vendor-queries";
import { VendorDirectory } from "./vendor-directory";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Find Local Service Professionals | Asset Atlas Pro",
  description:
    "Browse verified contractors in your area. Compare ratings, read reviews, and book service online.",
  alternates: {
    canonical: "https://www.assetatlaspro.com/vendors",
  },
  openGraph: {
    title: "Find Local Service Professionals",
    description:
      "Browse verified contractors in your area. Compare ratings, read reviews, and book service online.",
    type: "website",
    url: "https://www.assetatlaspro.com/vendors",
  },
};

export default async function VendorDirectoryPage() {
  const vendors = await getDirectoryVendors();

  // Derive filter options from the data
  const trades = [...new Set(vendors.flatMap((v) => v.trades))].sort();
  const cities = [
    ...new Set(
      vendors
        .map((v) => `${v.city}, ${v.state}`)
        .filter(Boolean)
    ),
  ].sort();

  // JSON-LD ItemList
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: "Local Service Professionals",
    numberOfItems: vendors.length,
    itemListElement: vendors.slice(0, 50).map((v, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "LocalBusiness",
        name: v.name,
        url: `https://www.assetatlaspro.com/vendors/${v.slug}`,
        ...(v.logo_url ? { image: v.logo_url } : {}),
        address: {
          "@type": "PostalAddress",
          addressLocality: v.city,
          addressRegion: v.state,
        },
        ...(v.avg_rating > 0 && v.total_ratings > 0
          ? {
              aggregateRating: {
                "@type": "AggregateRating",
                ratingValue: v.avg_rating,
                reviewCount: v.total_ratings,
              },
            }
          : {}),
      },
    })),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Find Local Service Professionals
          </h1>
          <p className="text-gray-600 mt-2">
            Browse verified contractors in your area
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <Suspense fallback={<div className="text-center py-8 text-gray-400">Loading...</div>}>
          <VendorDirectory
            vendors={vendors}
            trades={trades}
            cities={cities}
          />
        </Suspense>
      </div>
    </div>
  );
}
