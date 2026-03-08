import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getBookingPageDataSSR } from "./book-queries";
import { BookingForm } from "./booking-form";
import { TRADE_LABELS } from "@/lib/vendor/directory-utils";

export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const data = await getBookingPageDataSSR(slug);
  if (!data) return { title: "Booking Not Found" };

  const tradeList = data.trades
    .map((t) => TRADE_LABELS[t] || t)
    .slice(0, 3)
    .join(", ");
  const location = data.city && data.state ? ` in ${data.city}, ${data.state}` : "";
  const title = `Book ${data.name} — ${tradeList}${location}`;
  const description =
    data.booking_description ||
    `Request service from ${data.name}${location}. Professional ${tradeList.toLowerCase()} services.`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://www.assetatlaspro.com/book/${slug}`,
    },
    openGraph: {
      title: `Book ${data.name}`,
      description,
      type: "website",
      url: `https://www.assetatlaspro.com/book/${slug}`,
      ...(data.logo_url ? { images: [{ url: data.logo_url }] } : {}),
    },
  };
}

export default async function PublicBookingPage({ params }: Props) {
  const { slug } = await params;
  const data = await getBookingPageDataSSR(slug);

  if (!data) notFound();

  // JSON-LD LocalBusiness structured data
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: data.name,
    description: data.booking_description || data.description,
    url: `https://www.assetatlaspro.com/book/${slug}`,
    ...(data.phone ? { telephone: data.phone } : {}),
    ...(data.logo_url ? { image: data.logo_url } : {}),
    ...(data.city || data.state
      ? {
          address: {
            "@type": "PostalAddress",
            ...(data.city ? { addressLocality: data.city } : {}),
            ...(data.state ? { addressRegion: data.state } : {}),
          },
        }
      : {}),
    ...(data.avg_rating > 0 && data.total_ratings > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: data.avg_rating,
            reviewCount: data.total_ratings,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Services",
      itemListElement: data.trades.map((trade) => ({
        "@type": "Offer",
        itemOffered: {
          "@type": "Service",
          name: TRADE_LABELS[trade] || trade,
        },
      })),
    },
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-6">
          <div className="flex items-center gap-4">
            {data.logo_url && (
              <img
                src={data.logo_url}
                alt={data.name}
                className="w-14 h-14 rounded-xl object-cover"
              />
            )}
            <div>
              <h1 className="text-xl font-bold text-gray-900">{data.name}</h1>
              {data.city && data.state && (
                <p className="text-sm text-gray-500">
                  {data.city}, {data.state}
                </p>
              )}
              {data.avg_rating > 0 && (
                <div className="flex items-center gap-1 mt-0.5">
                  <span className="text-yellow-500 text-sm">★</span>
                  <span className="text-sm text-gray-600">
                    {data.avg_rating.toFixed(1)} ({data.total_ratings})
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {data.booking_headline || "Request a Service"}
          </h2>
          {data.booking_description && (
            <p className="text-gray-600">{data.booking_description}</p>
          )}
        </div>

        <BookingForm
          slug={slug}
          trades={data.trades}
          vendorName={data.name}
        />
      </div>
    </div>
  );
}
