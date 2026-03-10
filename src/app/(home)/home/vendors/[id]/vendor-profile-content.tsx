"use client";

import { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toggleSaveVendor, togglePreferredVendor } from "@/app/actions/home-vendors";
import { getVendorScorecardPublic } from "@/app/actions/vendor-scorecard";
import type { VendorScorecardData } from "@/lib/vendor/scorecard-types";

interface VendorOrg {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  phone: string | null;
  email: string | null;
  city: string | null;
  state: string | null;
  trades: string[];
  service_radius_miles: number;
  avg_rating: number;
  total_ratings: number;
  response_time_label: string | null;
  emergency_available: boolean;
}

interface Rating {
  id: string;
  rating: number;
  review: string | null;
  created_at: string;
  vendor_response: string | null;
  vendor_responded_at: string | null;
}

interface VendorProfileContentProps {
  vendor: VendorOrg;
  ratings: Rating[];
  initialSaved: boolean;
  initialPreferred: boolean;
}

const RESPONSE_LABELS: Record<string, string> = {
  same_day: "Same Day",
  next_day: "Next Day",
  within_48hrs: "Within 48 Hours",
};

export function VendorProfileContent({ vendor, ratings, initialSaved, initialPreferred }: VendorProfileContentProps) {
  const t = useTranslations("home.vendors");
  const st = useTranslations("vendor.clients.scorecard");
  const [saved, setSaved] = useState(initialSaved);
  const [preferred, setPreferred] = useState(initialPreferred);
  const [isPending, startTransition] = useTransition();
  const [scorecard, setScorecard] = useState<VendorScorecardData | null>(null);
  const [showScorecard, setShowScorecard] = useState(false);

  useEffect(() => {
    async function loadScorecard() {
      const res = await getVendorScorecardPublic(vendor.id);
      if (res.data) setScorecard(res.data);
    }
    loadScorecard();
  }, [vendor.id]);

  const handleSave = () => {
    startTransition(async () => {
      const result = await toggleSaveVendor(vendor.id);
      if (result.success) setSaved(result.saved);
    });
  };

  const handlePreferred = () => {
    startTransition(async () => {
      const result = await togglePreferredVendor(vendor.id);
      if (result.success) setPreferred(result.preferred);
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link href="/home/vendors" className="text-sm text-content-quaternary hover:text-content-primary transition-colors">
        &larr; {t("back")}
      </Link>

      {/* Vendor header */}
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-6">
        <div className="flex items-start gap-4">
          <div className="w-16 h-16 rounded-xl bg-rose-500/10 flex items-center justify-center flex-shrink-0">
            {vendor.logo_url ? (
              <img src={vendor.logo_url} alt="" className="w-full h-full object-cover rounded-xl" />
            ) : (
              <span className="text-2xl font-bold text-rose-400">{vendor.name.charAt(0)}</span>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-content-primary">{vendor.name}</h1>
            <div className="flex items-center gap-3 mt-1">
              <div className="flex items-center gap-1">
                <span className="text-amber-400">★</span>
                <span className="text-sm text-content-primary font-medium">
                  {vendor.avg_rating > 0 ? vendor.avg_rating.toFixed(1) : "—"}
                </span>
                <span className="text-sm text-content-quaternary">({vendor.total_ratings} {t("reviews").toLowerCase()})</span>
              </div>
              {vendor.response_time_label && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                  {RESPONSE_LABELS[vendor.response_time_label] ?? vendor.response_time_label}
                </span>
              )}
              {vendor.emergency_available && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">
                  24/7
                </span>
              )}
            </div>
            {vendor.city && (
              <p className="text-sm text-content-tertiary mt-1">{vendor.city}, {vendor.state}</p>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-3 mt-4">
          <button
            onClick={handlePreferred}
            disabled={isPending}
            className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              preferred
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                : "bg-rose-600 hover:bg-rose-700 text-white"
            }`}
          >
            {preferred ? t("removePreferred") : t("setPreferred")}
          </button>
          <button
            onClick={handleSave}
            disabled={isPending}
            className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
              saved
                ? "bg-amber-500/10 text-amber-400 border-amber-500/30"
                : "bg-surface-secondary text-content-tertiary border-edge-secondary hover:text-content-primary"
            }`}
          >
            {saved ? "★ " + t("unsaveVendor") : "☆ " + t("saveVendor")}
          </button>
        </div>
      </div>

      {/* About */}
      {vendor.description && (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-6">
          <h2 className="text-lg font-semibold text-content-primary mb-3">{t("about")}</h2>
          <p className="text-sm text-content-secondary">{vendor.description}</p>
        </div>
      )}

      {/* Details */}
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-content-quaternary">{t("trades")}</p>
            <div className="flex flex-wrap gap-1 mt-1">
              {vendor.trades.map((trade) => (
                <span key={trade} className="text-xs px-2 py-0.5 rounded-full bg-surface-secondary text-content-tertiary capitalize">
                  {trade}
                </span>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs text-content-quaternary">{t("serviceArea")}</p>
            <p className="text-sm text-content-primary">{t("miles", { count: vendor.service_radius_miles })}</p>
          </div>
          <div>
            <p className="text-xs text-content-quaternary">{t("responseTimeLabel")}</p>
            <p className="text-sm text-content-primary">{vendor.response_time_label ? RESPONSE_LABELS[vendor.response_time_label] ?? vendor.response_time_label : "—"}</p>
          </div>
          {vendor.phone && (
            <div>
              <p className="text-xs text-content-quaternary">{t("contact")}</p>
              <p className="text-sm text-content-primary">{vendor.phone}</p>
            </div>
          )}
        </div>
      </div>

      {/* Performance Scorecard */}
      {scorecard && (
        <div className="bg-surface-primary rounded-xl border border-edge-primary overflow-hidden">
          <button
            onClick={() => setShowScorecard((v) => !v)}
            className="w-full flex items-center justify-between p-6 text-left"
          >
            <h2 className="text-lg font-semibold text-content-primary">{t("performance")}</h2>
            <svg
              className={`w-5 h-5 text-content-quaternary transition-transform ${showScorecard ? "rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          {showScorecard && (
            <div className="border-t border-edge-secondary">
              <HomeScorecard data={scorecard} />
            </div>
          )}
        </div>
      )}

      {/* Reviews */}
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-6">
        <h2 className="text-lg font-semibold text-content-primary mb-4">{t("reviews")} ({ratings.length})</h2>
        {ratings.length === 0 ? (
          <p className="text-sm text-content-quaternary text-center py-4">{t("noReviews")}</p>
        ) : (
          <div className="space-y-4">
            {ratings.map((r) => (
              <div key={r.id} className="border-b border-edge-secondary last:border-0 pb-4 last:pb-0">
                <div className="flex items-center gap-2">
                  <span className="text-amber-400 text-sm">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span>
                  <span className="text-xs text-content-quaternary">{new Date(r.created_at).toLocaleDateString()}</span>
                </div>
                {r.review && <p className="text-sm text-content-secondary mt-1">{r.review}</p>}
                {r.vendor_response && (
                  <div className="mt-2 ml-4 pl-3 border-l-2 border-brand-400/30">
                    <p className="text-xs font-medium text-brand-400 mb-0.5">
                      {vendor.name}
                    </p>
                    <p className="text-sm text-content-tertiary">{r.vendor_response}</p>
                    {r.vendor_responded_at && (
                      <p className="text-xs text-content-quaternary mt-0.5">
                        {new Date(r.vendor_responded_at).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/** Lightweight scorecard display for homeowner vendor profile */
function HomeScorecard({ data }: { data: VendorScorecardData }) {
  const t = useTranslations("vendor.clients.scorecard");
  const maxRating = 5;
  const barHeight = 40;

  const formatResponseTime = (label: string | null) => {
    switch (label) {
      case "same_day": return t("sameDay");
      case "next_day": return t("nextDay");
      case "within_48hrs": return t("within48");
      default: return t("noData");
    }
  };

  return (
    <div className="space-y-3 p-4">
      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-surface-secondary rounded-lg px-3 py-2">
          <p className="text-lg font-bold text-content-primary">{data.total_jobs}</p>
          <p className="text-xs text-content-quaternary">{t("totalJobs")}</p>
        </div>
        <div className="bg-surface-secondary rounded-lg px-3 py-2">
          <p className="text-lg font-bold text-content-primary">{data.wilson_score}%</p>
          <p className="text-xs text-content-quaternary">{t("confidence")}</p>
        </div>
      </div>

      {/* Monthly trend */}
      {data.monthly_trend && data.monthly_trend.some((b) => b.review_count > 0) && (
        <div className="bg-surface-secondary rounded-lg p-3">
          <p className="text-xs text-content-tertiary mb-2">{t("monthlyTrend")}</p>
          <div className="flex items-end gap-1.5">
            {data.monthly_trend.map((bucket) => {
              const height = bucket.avg_rating != null ? Math.max(4, (bucket.avg_rating / maxRating) * barHeight) : 4;
              const color =
                bucket.avg_rating == null
                  ? "bg-surface-tertiary"
                  : bucket.avg_rating >= 4
                    ? "bg-green-500"
                    : bucket.avg_rating >= 3
                      ? "bg-yellow-500"
                      : "bg-red-500";

              return (
                <div key={bucket.month} className="flex-1 flex flex-col items-center gap-1">
                  <div className="relative w-full flex justify-center" style={{ height: barHeight }}>
                    <div
                      className={`w-full max-w-[18px] rounded-sm ${color}`}
                      style={{ height, position: "absolute", bottom: 0 }}
                    />
                  </div>
                  <span className="text-[10px] text-content-quaternary">{bucket.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
          {formatResponseTime(data.response_time_label)}
        </span>
        {data.on_time_pct != null && (
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            data.on_time_pct >= 80
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
          }`}>
            {data.on_time_pct}% {t("onTime")}
          </span>
        )}
        {data.dispute_rate != null && data.dispute_rate > 0 && (
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            data.dispute_rate <= 5
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          }`}>
            {data.dispute_rate}% {t("disputeRate")}
          </span>
        )}
        {data.callback_rate != null && data.callback_rate > 0 && (
          <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
            data.callback_rate <= 5
              ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
              : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
          }`}>
            {data.callback_rate}% {t("callbackRate")}
          </span>
        )}
      </div>
    </div>
  );
}
