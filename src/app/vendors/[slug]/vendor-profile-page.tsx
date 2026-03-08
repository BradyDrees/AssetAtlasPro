"use client";

import Link from "next/link";
import { TRADE_LABELS } from "@/lib/vendor/directory-utils";
import type { DirectoryVendor, VendorReview } from "../vendor-queries";

interface VendorProfilePageProps {
  vendor: DirectoryVendor;
  reviews: VendorReview[];
}

export function VendorProfilePage({ vendor, reviews }: VendorProfilePageProps) {
  return (
    <>
      {/* Hero */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="flex items-start gap-5">
            {vendor.logo_url ? (
              <img
                src={vendor.logo_url}
                alt={vendor.name}
                className="w-20 h-20 rounded-2xl object-cover flex-shrink-0"
              />
            ) : (
              <div className="w-20 h-20 rounded-2xl bg-green-100 flex items-center justify-center flex-shrink-0">
                <span className="text-green-700 font-bold text-3xl">
                  {vendor.name.charAt(0)}
                </span>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{vendor.name}</h1>
              <p className="text-gray-500 mt-0.5">
                {vendor.city}, {vendor.state}
              </p>

              {/* Rating */}
              <div className="flex items-center gap-2 mt-2">
                {vendor.avg_rating > 0 ? (
                  <>
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className={`text-base ${
                            star <= Math.round(vendor.avg_rating)
                              ? "text-yellow-500"
                              : "text-gray-300"
                          }`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="text-sm text-gray-600">
                      {vendor.avg_rating.toFixed(1)} out of 5 stars
                    </span>
                    <span className="text-sm text-gray-400">
                      ({vendor.total_ratings} {vendor.total_ratings === 1 ? "review" : "reviews"})
                    </span>
                  </>
                ) : (
                  <span className="text-sm bg-blue-100 text-blue-700 px-2.5 py-0.5 rounded-full font-medium">
                    New
                  </span>
                )}
              </div>

              {/* Badges */}
              <div className="flex items-center gap-2 mt-2">
                {vendor.response_time_label && (
                  <span className="text-xs bg-green-50 text-green-700 px-2.5 py-1 rounded-full border border-green-200 font-medium">
                    {vendor.response_time_label === "same_day"
                      ? "Same Day Response"
                      : vendor.response_time_label === "next_day"
                        ? "Next Day Response"
                        : "Responds Within 48hrs"}
                  </span>
                )}
                {vendor.emergency_available && (
                  <span className="text-xs bg-red-50 text-red-700 px-2.5 py-1 rounded-full border border-red-200 font-medium">
                    24/7 Emergency
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* About */}
        {vendor.description && (
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">About</h2>
            <p className="text-gray-600 whitespace-pre-wrap">{vendor.description}</p>
          </section>
        )}

        {/* Services */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-3">Services Offered</h2>
          <div className="flex flex-wrap gap-2">
            {vendor.trades.map((t) => (
              <span
                key={t}
                className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-sm font-medium"
              >
                {TRADE_LABELS[t] || t}
              </span>
            ))}
          </div>
        </section>

        {/* Service Area */}
        {vendor.service_radius_miles > 0 && (
          <section className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Service Area</h2>
            <p className="text-gray-600">
              {vendor.service_radius_miles} mile radius from {vendor.city}, {vendor.state}
            </p>
          </section>
        )}

        {/* Reviews */}
        <section className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Customer Reviews
            {vendor.total_ratings > 0 && (
              <span className="text-sm font-normal text-gray-500 ml-2">
                ({vendor.total_ratings})
              </span>
            )}
          </h2>

          {reviews.length === 0 ? (
            <p className="text-gray-500">No reviews yet</p>
          ) : (
            <div className="space-y-4">
              {reviews.map((r) => (
                <div key={r.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <span
                          key={star}
                          className={`text-sm ${
                            star <= r.rating ? "text-yellow-500" : "text-gray-300"
                          }`}
                        >
                          ★
                        </span>
                      ))}
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(r.created_at).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                  {r.review && (
                    <p className="text-sm text-gray-600">{r.review}</p>
                  )}
                  <p className="text-xs text-gray-400 mt-1">Verified Customer</p>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Book CTA */}
        {vendor.booking_enabled && (
          <div className="bg-green-50 rounded-xl border border-green-200 p-6 text-center">
            <h2 className="text-lg font-semibold text-gray-900 mb-2">
              Ready to book {vendor.name}?
            </h2>
            <p className="text-gray-600 text-sm mb-4">
              Request service directly — we&apos;ll get back to you shortly.
            </p>
            <Link
              href={`/book/${vendor.slug}`}
              className="inline-block bg-green-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-green-700 transition-colors text-lg"
            >
              Book Now
            </Link>
          </div>
        )}

        {/* Footer */}
        <div className="text-center py-4">
          <Link href="/vendors" className="text-sm text-gray-400 hover:text-gray-600">
            ← Browse All Vendors
          </Link>
        </div>
      </div>
    </>
  );
}
