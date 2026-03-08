import { Suspense } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import Link from "next/link";
import { getVendorsByTradeAndCity, getCityTradeCombos } from "../../vendor-queries";
import { TRADE_LABELS, parseCitySlug, buildCitySlug } from "@/lib/vendor/directory-utils";
import { VendorDirectory } from "../../vendor-directory";

export const revalidate = 3600;

interface Props {
  params: Promise<{ trade: string; city: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { trade, city: citySlug } = await params;
  const parsed = parseCitySlug(citySlug);
  if (!parsed) return { title: "Not Found" };

  const tradeLabel = TRADE_LABELS[trade] || trade;
  const title = `${tradeLabel} in ${parsed.city}, ${parsed.state} | Asset Atlas Pro`;
  const description = `Find trusted ${tradeLabel.toLowerCase()} professionals in ${parsed.city}, ${parsed.state}. Compare ratings, read reviews, and book service online.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://www.assetatlaspro.com/vendors/${trade}/${citySlug}`,
    },
    openGraph: {
      title: `${tradeLabel} in ${parsed.city}, ${parsed.state}`,
      description,
      type: "website",
      url: `https://www.assetatlaspro.com/vendors/${trade}/${citySlug}`,
    },
  };
}

export default async function CityTradeLandingPage({ params }: Props) {
  const { trade, city: citySlug } = await params;
  const parsed = parseCitySlug(citySlug);

  if (!parsed) notFound();
  if (!TRADE_LABELS[trade]) notFound();

  const vendors = await getVendorsByTradeAndCity(trade, parsed.city, parsed.state);

  // Minimum 3 vendors to avoid thin content
  if (vendors.length < 3) notFound();

  const tradeLabel = TRADE_LABELS[trade];

  // Get related combos for cross-links
  const allCombos = await getCityTradeCombos(3);
  const otherTradesInCity = allCombos
    .filter((c) => c.city.toLowerCase() === parsed.city.toLowerCase() && c.state.toLowerCase() === parsed.state.toLowerCase() && c.trade !== trade)
    .slice(0, 6);
  const otherCitiesForTrade = allCombos
    .filter((c) => c.trade === trade && (c.city.toLowerCase() !== parsed.city.toLowerCase() || c.state.toLowerCase() !== parsed.state.toLowerCase()))
    .slice(0, 6);

  // Derive filter options from vendors
  const trades = [...new Set(vendors.flatMap((v) => v.trades))].sort();
  const cities = [...new Set(vendors.map((v) => `${v.city}, ${v.state}`))].sort();

  // JSON-LD ItemList
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name: `${tradeLabel} in ${parsed.city}, ${parsed.state}`,
    numberOfItems: vendors.length,
    itemListElement: vendors.map((v, i) => ({
      "@type": "ListItem",
      position: i + 1,
      item: {
        "@type": "LocalBusiness",
        name: v.name,
        url: `https://www.assetatlaspro.com/vendors/${v.slug}`,
        address: {
          "@type": "PostalAddress",
          addressLocality: v.city,
          addressRegion: v.state,
        },
        ...(v.avg_rating > 0
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

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-3">
            <Link href="/vendors" className="hover:text-gray-700">
              Vendors
            </Link>
            <span>/</span>
            <span className="text-gray-900">{tradeLabel}</span>
            <span>/</span>
            <span className="text-gray-900">{parsed.city}, {parsed.state}</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900">
            {tradeLabel} in {parsed.city}, {parsed.state}
          </h1>
          <p className="text-gray-600 mt-2">
            {vendors.length} verified {tradeLabel.toLowerCase()} contractors in {parsed.city}, {parsed.state}.
            Compare ratings, read reviews, and book service online.
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        <Suspense fallback={<div className="text-center py-8 text-gray-400">Loading...</div>}>
          <VendorDirectory vendors={vendors} trades={trades} cities={cities} />
        </Suspense>

        {/* Cross-links */}
        <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-8">
          {otherTradesInCity.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Other Services in {parsed.city}
              </h2>
              <div className="flex flex-wrap gap-2">
                {otherTradesInCity.map((c) => (
                  <Link
                    key={c.trade}
                    href={`/vendors/${c.trade}/${buildCitySlug(c.city, c.state)}`}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {TRADE_LABELS[c.trade] || c.trade}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {otherCitiesForTrade.length > 0 && (
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-3">
                Find {tradeLabel} in Other Cities
              </h2>
              <div className="flex flex-wrap gap-2">
                {otherCitiesForTrade.map((c) => (
                  <Link
                    key={`${c.city}-${c.state}`}
                    href={`/vendors/${c.trade}/${buildCitySlug(c.city, c.state)}`}
                    className="px-3 py-1.5 bg-white border border-gray-200 rounded-full text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                  >
                    {c.city}, {c.state}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Back link */}
        <div className="text-center py-8">
          <Link href="/vendors" className="text-sm text-gray-400 hover:text-gray-600">
            ← Browse All Vendors
          </Link>
        </div>
      </div>
    </div>
  );
}
