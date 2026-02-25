"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { toggleSaveVendor, togglePreferredVendor } from "@/app/actions/home-vendors";

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
  const [saved, setSaved] = useState(initialSaved);
  const [preferred, setPreferred] = useState(initialPreferred);
  const [isPending, startTransition] = useTransition();

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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
