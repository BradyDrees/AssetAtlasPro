"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { TRADE_LABELS } from "@/lib/vendor/directory-utils";
import type { DirectoryVendor, VendorReview } from "../vendor-queries";
import { getVendorScorecardPublic } from "@/app/actions/vendor-scorecard";
import type { VendorScorecardData, MonthlyTrendBucket } from "@/lib/vendor/scorecard-types";

interface VendorProfilePageProps {
  vendor: DirectoryVendor;
  reviews: VendorReview[];
}

/** Mini sparkline for public profile */
function PublicTrendChart({ trend }: { trend: MonthlyTrendBucket[] }) {
  const barHeight = 36;
  const maxRating = 5;
  const hasData = trend.some((b) => b.review_count > 0);
  if (!hasData) return null;

  return (
    <div className="flex items-end gap-1">
      {trend.map((bucket) => {
        const height = bucket.avg_rating != null ? Math.max(3, (bucket.avg_rating / maxRating) * barHeight) : 3;
        const color =
          bucket.avg_rating == null
            ? "bg-gray-200"
            : bucket.avg_rating >= 4
              ? "bg-green-500"
              : bucket.avg_rating >= 3
                ? "bg-yellow-400"
                : "bg-red-400";

        return (
          <div key={bucket.month} className="flex-1 flex flex-col items-center gap-0.5">
            <div className="relative w-full flex justify-center" style={{ height: barHeight }}>
              <div
                className={`w-full max-w-[16px] rounded-sm ${color}`}
                style={{ height, position: "absolute", bottom: 0 }}
                title={
                  bucket.avg_rating != null
                    ? `${bucket.label}: ${bucket.avg_rating} avg (${bucket.review_count} reviews)`
                    : `${bucket.label}: No reviews`
                }
              />
            </div>
            <span className="text-[9px] text-gray-400">{bucket.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export function VendorProfilePage({ vendor, reviews }: VendorProfilePageProps) {
  const [scorecard, setScorecard] = useState<VendorScorecardData | null>(null);
  const [showStats, setShowStats] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await getVendorScorecardPublic(vendor.id);
      if (res.data) setScorecard(res.data);
    }
    load();
  }, [vendor.id]);

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

        {/* Performance Stats */}
        {scorecard && (
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button
              onClick={() => setShowStats((v) => !v)}
              className="w-full flex items-center justify-between p-6 text-left"
            >
              <h2 className="text-lg font-semibold text-gray-900">Performance</h2>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${showStats ? "rotate-180" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
              </svg>
            </button>
            {showStats && (
              <div className="border-t border-gray-200 p-6 space-y-4">
                {/* Stats row */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xl font-bold text-gray-900">{scorecard.total_jobs}</p>
                    <p className="text-xs text-gray-500">Completed Jobs</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xl font-bold text-gray-900">{scorecard.wilson_score}%</p>
                    <p className="text-xs text-gray-500">Confidence</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <p className="text-xl font-bold text-gray-900">
                      {scorecard.on_time_pct != null ? `${scorecard.on_time_pct}%` : "—"}
                    </p>
                    <p className="text-xs text-gray-500">On Time</p>
                  </div>
                </div>

                {/* Trend */}
                {scorecard.monthly_trend && scorecard.monthly_trend.some((b) => b.review_count > 0) && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-xs font-medium text-gray-500 mb-2">Rating Trend (Last 6 Months)</p>
                    <PublicTrendChart trend={scorecard.monthly_trend} />
                  </div>
                )}

                {/* Quality badges */}
                <div className="flex flex-wrap gap-2">
                  {scorecard.estimate_accuracy_pct != null && (
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                      scorecard.estimate_accuracy_pct >= 85
                        ? "bg-green-50 text-green-700 border border-green-200"
                        : "bg-yellow-50 text-yellow-700 border border-yellow-200"
                    }`}>
                      {scorecard.estimate_accuracy_pct}% Estimate Accuracy
                    </span>
                  )}
                  {scorecard.dispute_rate != null && scorecard.dispute_rate <= 5 && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                      Low Dispute Rate
                    </span>
                  )}
                  {scorecard.callback_rate != null && scorecard.callback_rate <= 5 && (
                    <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-green-50 text-green-700 border border-green-200">
                      Low Callback Rate
                    </span>
                  )}
                </div>
              </div>
            )}
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
                  {r.vendor_response && (
                    <div className="mt-3 ml-4 pl-3 border-l-2 border-green-200">
                      <p className="text-xs font-medium text-green-700 mb-0.5">
                        Response from {vendor.name}
                      </p>
                      <p className="text-sm text-gray-600">{r.vendor_response}</p>
                      {r.vendor_responded_at && (
                        <p className="text-xs text-gray-400 mt-0.5">
                          {new Date(r.vendor_responded_at).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </p>
                      )}
                    </div>
                  )}
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
