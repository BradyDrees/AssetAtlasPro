"use client";

import { useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { searchVendorDirectory } from "@/app/actions/vendor-directory";
import type { DirectoryVendor, DirectoryFilters } from "@/app/actions/vendor-directory";
import { VendorDirectoryCard } from "./vendor-directory-card";
import { ConnectionRequestModal } from "./connection-request-modal";

interface VendorDirectoryBrowserProps {
  initialVendors: DirectoryVendor[];
  trades: string[];
  cities: string[];
}

export function VendorDirectoryBrowser({
  initialVendors,
  trades,
  cities,
}: VendorDirectoryBrowserProps) {
  const t = useTranslations("operate.vendors.directory");
  const [vendors, setVendors] = useState(initialVendors);
  const [loading, setLoading] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<DirectoryVendor | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [trade, setTrade] = useState("");
  const [city, setCity] = useState("");
  const [minRating, setMinRating] = useState("");
  const [responseTime, setResponseTime] = useState("");
  const [sortBy, setSortBy] = useState<DirectoryFilters["sortBy"]>("rating");

  const runSearch = useCallback(async (overrides: Partial<DirectoryFilters> = {}) => {
    setLoading(true);
    const filters: DirectoryFilters = {
      search: overrides.search ?? search,
      trade: overrides.trade ?? (trade || undefined),
      city: overrides.city ?? (city || undefined),
      minRating: overrides.minRating ?? (minRating ? Number(minRating) : undefined),
      responseTime: overrides.responseTime ?? (responseTime || undefined),
      sortBy: overrides.sortBy ?? sortBy,
    };
    const result = await searchVendorDirectory(filters);
    setVendors(result.data);
    setLoading(false);
  }, [search, trade, city, minRating, responseTime, sortBy]);

  const handleFilterChange = (key: string, value: string) => {
    const override: Partial<DirectoryFilters> = {};
    switch (key) {
      case "trade":
        setTrade(value);
        override.trade = value || undefined;
        break;
      case "city":
        setCity(value);
        override.city = value || undefined;
        break;
      case "minRating":
        setMinRating(value);
        override.minRating = value ? Number(value) : undefined;
        break;
      case "responseTime":
        setResponseTime(value);
        override.responseTime = value || undefined;
        break;
      case "sortBy":
        setSortBy(value as DirectoryFilters["sortBy"]);
        override.sortBy = value as DirectoryFilters["sortBy"];
        break;
    }
    runSearch(override);
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    // Debounced search — trigger on Enter or after 500ms pause
    runSearch({ search: value });
  };

  const handleConnectionSuccess = () => {
    setSelectedVendor(null);
    runSearch();
  };

  return (
    <div className="space-y-4">
      {/* Search + Filters */}
      <div className="bg-surface-secondary border border-edge-primary rounded-xl p-4">
        {/* Search bar */}
        <div className="relative mb-4">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-quaternary"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch(search)}
            placeholder={t("searchPlaceholder")}
            className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-surface-primary border border-edge-primary text-content-primary placeholder:text-content-quaternary text-sm focus:outline-none focus:ring-2 focus:ring-green-500/40 focus:border-green-500/40"
          />
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap gap-3">
          {/* Trade filter */}
          <select
            value={trade}
            onChange={(e) => handleFilterChange("trade", e.target.value)}
            className="px-3 py-2 rounded-lg bg-surface-primary border border-edge-primary text-content-secondary text-sm focus:outline-none focus:ring-2 focus:ring-green-500/40 min-w-[140px]"
          >
            <option value="">{t("allTrades")}</option>
            {trades.map((tr) => (
              <option key={tr} value={tr}>{tr}</option>
            ))}
          </select>

          {/* City filter */}
          <select
            value={city}
            onChange={(e) => handleFilterChange("city", e.target.value)}
            className="px-3 py-2 rounded-lg bg-surface-primary border border-edge-primary text-content-secondary text-sm focus:outline-none focus:ring-2 focus:ring-green-500/40 min-w-[140px]"
          >
            <option value="">{t("allCities")}</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {/* Rating filter */}
          <select
            value={minRating}
            onChange={(e) => handleFilterChange("minRating", e.target.value)}
            className="px-3 py-2 rounded-lg bg-surface-primary border border-edge-primary text-content-secondary text-sm focus:outline-none focus:ring-2 focus:ring-green-500/40 min-w-[130px]"
          >
            <option value="">{t("anyRating")}</option>
            <option value="4">{t("stars", { count: "4+" })}</option>
            <option value="3">{t("stars", { count: "3+" })}</option>
            <option value="2">{t("stars", { count: "2+" })}</option>
          </select>

          {/* Response time filter */}
          <select
            value={responseTime}
            onChange={(e) => handleFilterChange("responseTime", e.target.value)}
            className="px-3 py-2 rounded-lg bg-surface-primary border border-edge-primary text-content-secondary text-sm focus:outline-none focus:ring-2 focus:ring-green-500/40 min-w-[140px]"
          >
            <option value="">{t("anyResponseTime")}</option>
            <option value="same_day">{t("responseTime.same_day")}</option>
            <option value="next_day">{t("responseTime.next_day")}</option>
            <option value="within_48hrs">{t("responseTime.within_48hrs")}</option>
          </select>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={(e) => handleFilterChange("sortBy", e.target.value)}
            className="px-3 py-2 rounded-lg bg-surface-primary border border-edge-primary text-content-secondary text-sm focus:outline-none focus:ring-2 focus:ring-green-500/40 min-w-[150px] ml-auto"
          >
            <option value="rating">{t("sortRating")}</option>
            <option value="reviews">{t("sortReviews")}</option>
            <option value="response_time">{t("sortResponseTime")}</option>
            <option value="name">{t("sortName")}</option>
          </select>
        </div>
      </div>

      {/* Results */}
      {loading ? (
        <div className="text-center py-12">
          <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-content-quaternary text-sm">Loading...</p>
        </div>
      ) : vendors.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-16 h-16 rounded-full bg-surface-tertiary flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-content-quaternary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h3 className="text-content-secondary font-medium mb-1">{t("noResults")}</h3>
          <p className="text-content-quaternary text-sm">{t("noResultsHint")}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {vendors.map((vendor) => (
            <VendorDirectoryCard
              key={vendor.id}
              vendor={vendor}
              onRequestConnection={setSelectedVendor}
            />
          ))}
        </div>
      )}

      {/* Connection request modal */}
      {selectedVendor && (
        <ConnectionRequestModal
          vendor={selectedVendor}
          onClose={() => setSelectedVendor(null)}
          onSuccess={handleConnectionSuccess}
        />
      )}
    </div>
  );
}
