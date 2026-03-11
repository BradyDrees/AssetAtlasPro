"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { useSearchParams, useRouter } from "next/navigation";
import { assignVendorToWo } from "@/app/actions/home-work-orders";
import { VendorTrustBadges } from "@/components/home/vendor-trust-badges";
import type { VendorBadgeData } from "@/lib/home/vendor-badge-types";

interface VendorOrg {
  id: string;
  name: string;
  logo_url: string | null;
  description: string | null;
  trades: string[];
  city: string | null;
  state: string | null;
  service_radius_miles: number;
  avg_rating: number;
  total_ratings: number;
  response_time_label: string | null;
  emergency_available: boolean;
}

const RESPONSE_TIME_LABELS: Record<string, string> = {
  same_day: "Same Day",
  next_day: "Next Day",
  within_48hrs: "48hrs",
};

export function VendorMarketplaceContent({ vendors, badgeMap = {} }: { vendors: VendorOrg[]; badgeMap?: Record<string, VendorBadgeData> }) {
  const t = useTranslations("home.vendors");
  const searchParams = useSearchParams();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const woId = searchParams.get("wo");
  const [search, setSearch] = useState("");
  const [tradeFilter, setTradeFilter] = useState<string>("");
  const [showFilters, setShowFilters] = useState(false);
  const [minRating, setMinRating] = useState(false);
  const [emergencyOnly, setEmergencyOnly] = useState(false);

  function handleSelectForWO(vendorId: string) {
    if (!woId) return;
    startTransition(async () => {
      const result = await assignVendorToWo(woId, vendorId);
      if (result.success) {
        router.push(`/home/work-orders/${woId}`);
      }
    });
  }

  // Collect all unique trades
  const allTrades = Array.from(new Set(vendors.flatMap((v) => v.trades))).sort();

  // Filter vendors
  const filtered = vendors.filter((v) => {
    if (search && !v.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (tradeFilter && !v.trades.includes(tradeFilter)) return false;
    if (minRating && v.avg_rating < 4) return false;
    if (emergencyOnly && !v.emergency_available) return false;
    return true;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* WO assignment banner */}
      {woId && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm text-rose-300 font-medium">{t("selectVendorForWO")}</p>
          <Link href={`/home/work-orders/${woId}`} className="text-xs text-content-quaternary hover:text-content-tertiary">
            {t("cancel")}
          </Link>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">{t("title")}</h1>
          <p className="text-sm text-content-tertiary mt-1">{t("subtitle")}</p>
        </div>
        <Link
          href="/home/vendors/saved"
          className="text-sm text-rose-500 hover:text-rose-400 font-medium"
        >
          {t("savedVendors")}
        </Link>
      </div>

      {/* Search + filters */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-content-quaternary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("search")}
              className="w-full pl-10 pr-4 py-2.5 bg-surface-primary border border-edge-primary rounded-lg text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50"
            />
          </div>
          <select
            value={tradeFilter}
            onChange={(e) => setTradeFilter(e.target.value)}
            className="px-3 py-2.5 bg-surface-primary border border-edge-primary rounded-lg text-content-primary text-sm"
          >
            <option value="">{t("allTrades")}</option>
            {allTrades.map((trade) => (
              <option key={trade} value={trade}>{trade}</option>
            ))}
          </select>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2.5 border rounded-lg text-sm font-medium transition-colors ${
              showFilters ? "bg-rose-500/10 border-rose-500/30 text-rose-400" : "bg-surface-primary border-edge-primary text-content-tertiary"
            }`}
          >
            {t("filters")}
          </button>
        </div>

        {showFilters && (
          <div className="flex flex-wrap gap-2 bg-surface-primary border border-edge-primary rounded-lg p-3">
            <button
              onClick={() => setMinRating(!minRating)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                minRating ? "bg-amber-500/20 text-amber-400 border-amber-500/30" : "bg-surface-secondary text-content-tertiary border-edge-secondary"
              }`}
            >
              {t("fourPlusStars")}
            </button>
            <button
              onClick={() => setEmergencyOnly(!emergencyOnly)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                emergencyOnly ? "bg-red-500/20 text-red-400 border-red-500/30" : "bg-surface-secondary text-content-tertiary border-edge-secondary"
              }`}
            >
              {t("emergencyAvailable")}
            </button>
            {(minRating || emergencyOnly) && (
              <button
                onClick={() => { setMinRating(false); setEmergencyOnly(false); }}
                className="px-3 py-1.5 text-xs text-content-quaternary hover:text-content-tertiary"
              >
                {t("clearFilters")}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Vendor cards */}
      {filtered.length === 0 ? (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center">
          <p className="text-sm text-content-quaternary">{t("noResults")}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((vendor) => {
            const cardContent = (
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-rose-500/10 flex items-center justify-center flex-shrink-0">
                  {vendor.logo_url ? (
                    <img src={vendor.logo_url} alt="" className="w-full h-full object-cover rounded-lg" />
                  ) : (
                    <span className="text-lg font-bold text-rose-400">{vendor.name.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-semibold text-content-primary truncate">{vendor.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <div className="flex items-center gap-1">
                      <span className="text-amber-400 text-xs">★</span>
                      <span className="text-xs text-content-primary font-medium">{vendor.avg_rating > 0 ? vendor.avg_rating.toFixed(1) : "—"}</span>
                      <span className="text-xs text-content-quaternary">({vendor.total_ratings})</span>
                    </div>
                    {vendor.response_time_label && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400">
                        {RESPONSE_TIME_LABELS[vendor.response_time_label] ?? vendor.response_time_label}
                      </span>
                    )}
                    {vendor.emergency_available && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-500/10 text-red-400">
                        24/7
                      </span>
                    )}
                  </div>
                  {vendor.trades.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {vendor.trades.slice(0, 3).map((trade) => (
                        <span key={trade} className="text-[10px] px-2 py-0.5 rounded-full bg-surface-secondary text-content-tertiary capitalize">
                          {trade}
                        </span>
                      ))}
                      {vendor.trades.length > 3 && (
                        <span className="text-[10px] text-content-quaternary">+{vendor.trades.length - 3}</span>
                      )}
                    </div>
                  )}
                  {vendor.city && (
                    <p className="text-xs text-content-quaternary mt-1">{vendor.city}, {vendor.state}</p>
                  )}
                  {badgeMap[vendor.id] && (
                    <div className="mt-2">
                      <VendorTrustBadges badges={badgeMap[vendor.id]} />
                    </div>
                  )}
                  {woId && (
                    <button
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); handleSelectForWO(vendor.id); }}
                      disabled={isPending}
                      className="mt-3 w-full px-3 py-2 bg-rose-600 hover:bg-rose-700 disabled:bg-charcoal-700 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      {isPending ? t("assigning") : t("selectForWO")}
                    </button>
                  )}
                </div>
              </div>
            );

            return woId ? (
              <div
                key={vendor.id}
                className="bg-surface-primary rounded-xl border border-edge-primary p-5 hover:border-rose-500/30 transition-colors"
              >
                {cardContent}
              </div>
            ) : (
              <Link
                key={vendor.id}
                href={`/home/vendors/${vendor.id}`}
                className="bg-surface-primary rounded-xl border border-edge-primary p-5 hover:border-rose-500/30 transition-colors"
              >
                {cardContent}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
