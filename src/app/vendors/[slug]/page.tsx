import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getVendorBySlug, getVendorReviews } from "../vendor-queries";
import { VendorProfilePage } from "./vendor-profile-page";
import { TRADE_LABELS } from "@/lib/vendor/directory-utils";

export const revalidate = 3600;

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug);
  if (!vendor) return { title: "Vendor Not Found" };

  const tradeList = vendor.trades
    .map((t) => TRADE_LABELS[t] || t)
    .slice(0, 3)
    .join(", ");
  const title = `${vendor.name} — ${tradeList} in ${vendor.city}, ${vendor.state}`;
  const description =
    vendor.description ||
    `${vendor.name} provides professional ${tradeList.toLowerCase()} services in ${vendor.city}, ${vendor.state}. ${
      vendor.avg_rating > 0
        ? `Rated ${vendor.avg_rating.toFixed(1)}/5 from ${vendor.total_ratings} reviews.`
        : "Book service online."
    }`;

  return {
    title,
    description,
    alternates: {
      canonical: `https://www.assetatlaspro.com/vendors/${slug}`,
    },
    openGraph: {
      title: vendor.name,
      description,
      type: "website",
      url: `https://www.assetatlaspro.com/vendors/${slug}`,
      ...(vendor.logo_url ? { images: [{ url: vendor.logo_url }] } : {}),
    },
  };
}

export default async function VendorProfileRoute({ params }: Props) {
  const { slug } = await params;
  const vendor = await getVendorBySlug(slug);

  if (!vendor) notFound();

  const reviews = await getVendorReviews(vendor.id);

  // JSON-LD LocalBusiness with reviews
  const jsonLd: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "LocalBusiness",
    name: vendor.name,
    description: vendor.description,
    url: `https://www.assetatlaspro.com/vendors/${slug}`,
    ...(vendor.phone ? { telephone: vendor.phone } : {}),
    ...(vendor.logo_url ? { image: vendor.logo_url } : {}),
    address: {
      "@type": "PostalAddress",
      addressLocality: vendor.city,
      addressRegion: vendor.state,
    },
    ...(vendor.avg_rating > 0 && vendor.total_ratings > 0
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: vendor.avg_rating,
            reviewCount: vendor.total_ratings,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    ...(reviews.length > 0
      ? {
          review: reviews.slice(0, 10).map((r) => ({
            "@type": "Review",
            reviewRating: {
              "@type": "Rating",
              ratingValue: r.rating,
              bestRating: 5,
            },
            author: { "@type": "Person", name: "Verified Customer" },
            datePublished: r.created_at.split("T")[0],
            ...(r.review ? { reviewBody: r.review } : {}),
          })),
        }
      : {}),
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Services",
      itemListElement: vendor.trades.map((trade) => ({
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
      <VendorProfilePage vendor={vendor} reviews={reviews} />
    </div>
  );
}
