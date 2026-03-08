"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useCallback } from "react";
import Link from "next/link";
import { TRADE_LABELS } from "@/lib/vendor/directory-utils";
import type { DirectoryVendor } from "./vendor-queries";

interface VendorDirectoryProps {
  vendors: DirectoryVendor[];
  trades: string[];
  cities: string[];
}

export function VendorDirectory({ vendors, trades, cities }: VendorDirectoryProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const activeTrade = searchParams.get("trade") || "";
  const activeCity = searchParams.get("city") || "";
  const searchQuery = searchParams.get("q") || "";

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      router.replace(`/vendors?${params.toString()}`, { scroll: false });
    },
    [searchParams, router]
  );

  // Apply filters
  const filtered = vendors.filter((v) => {
    if (activeTrade && !v.trades.includes(activeTrade)) return false;
    if (activeCity && `${v.city}, ${v.state}` !== activeCity) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchName = v.name.toLowerCase().includes(q);
      const matchTrade = v.trades.some(
        (t) => (TRADE_LABELS[t] || t).toLowerCase().includes(q)
      );
      const matchCity = v.city.toLowerCase().includes(q);
      if (!matchName && !matchTrade && !matchCity) return false;
    }
    return true;
  });

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <select
          value={activeTrade}
          onChange={(e) => updateFilter("trade", e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-green-500"
        >
          <option value="">All Services</option>
          {trades.map((t) => (
            <option key={t} value={t}>
              {TRADE_LABELS[t] || t}
            </option>
          ))}
        </select>

        <select
          value={activeCity}
          onChange={(e) => updateFilter("city", e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-green-500"
        >
          <option value="">All Cities</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search vendors..."
          defaultValue={searchQuery}
          onChange={(e) => updateFilter("q", e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 bg-white focus:ring-2 focus:ring-green-500 flex-1"
        />
      </div>

      {/* Results */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-500">No vendors found matching your filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((v) => (
            <VendorCard key={v.id} vendor={v} />
          ))}
        </div>
      )}
    </div>
  );
}

function VendorCard({ vendor }: { vendor: DirectoryVendor }) {
  return (
    <Link
      href={`/vendors/${vendor.slug}`}
      className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow block"
    >
      <div className="flex items-start gap-3 mb-3">
        {vendor.logo_url ? (
          <img
            src={vendor.logo_url}
            alt={vendor.name}
            className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-12 h-12 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0">
            <span className="text-green-700 font-bold text-lg">
              {vendor.name.charAt(0)}
            </span>
          </div>
        )}
        <div className="min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{vendor.name}</h3>
          <p className="text-sm text-gray-500">
            {vendor.city}, {vendor.state}
          </p>
        </div>
      </div>

      {/* Rating */}
      <div className="flex items-center gap-2 mb-3">
        {vendor.avg_rating > 0 ? (
          <>
            <div className="flex items-center gap-0.5">
              {[1, 2, 3, 4, 5].map((star) => (
                <span
                  key={star}
                  className={`text-sm ${
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
              {vendor.avg_rating.toFixed(1)} ({vendor.total_ratings})
            </span>
          </>
        ) : (
          <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
            New
          </span>
        )}
      </div>

      {/* Trades */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {vendor.trades.slice(0, 3).map((t) => (
          <span
            key={t}
            className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
          >
            {TRADE_LABELS[t] || t}
          </span>
        ))}
        {vendor.trades.length > 3 && (
          <span className="text-xs text-gray-400">
            +{vendor.trades.length - 3} more
          </span>
        )}
      </div>

      {/* Badges */}
      <div className="flex items-center gap-2">
        {vendor.response_time_label && (
          <span className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full border border-green-200">
            {vendor.response_time_label === "same_day"
              ? "Same Day"
              : vendor.response_time_label === "next_day"
                ? "Next Day"
                : "Within 48hrs"}
          </span>
        )}
        {vendor.emergency_available && (
          <span className="text-xs bg-red-50 text-red-700 px-2 py-0.5 rounded-full border border-red-200">
            24/7
          </span>
        )}
      </div>
    </Link>
  );
}
