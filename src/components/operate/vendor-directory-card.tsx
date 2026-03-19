"use client";

import { useTranslations } from "next-intl";
import type { DirectoryVendor } from "@/app/actions/vendor-directory";

interface VendorDirectoryCardProps {
  vendor: DirectoryVendor;
  onRequestConnection: (vendor: DirectoryVendor) => void;
}

export function VendorDirectoryCard({
  vendor,
  onRequestConnection,
}: VendorDirectoryCardProps) {
  const t = useTranslations("operate.vendors.directory");
  const tc = useTranslations("operate.vendors.connection");

  const renderStars = (rating: number) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <svg
          key={i}
          className={`w-4 h-4 ${i <= Math.round(rating) ? "text-gold-400" : "text-content-quaternary/30"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      );
    }
    return stars;
  };

  const connectionButton = () => {
    switch (vendor.connectionStatus) {
      case "active":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/15 text-green-400 text-sm font-medium">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {tc("connected")}
          </span>
        );
      case "pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gold-500/15 text-gold-400 text-sm font-medium">
            <svg className="w-4 h-4 animate-pulse" fill="currentColor" viewBox="0 0 20 20">
              <circle cx="10" cy="10" r="3" />
            </svg>
            {tc("pending")}
          </span>
        );
      case "declined":
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-content-quaternary/15 text-content-quaternary text-sm font-medium">
            {tc("declined")}
          </span>
        );
      default:
        return (
          <button
            onClick={() => onRequestConnection(vendor)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            {tc("requestConnection")}
          </button>
        );
    }
  };

  return (
    <div className="bg-surface-secondary border border-edge-primary rounded-xl p-5 hover:border-edge-secondary transition-colors">
      {/* Header: Logo + Name + Connection */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-3 min-w-0">
          {vendor.logo_url ? (
            <img
              src={vendor.logo_url}
              alt={vendor.name}
              className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-green-600/20 flex items-center justify-center flex-shrink-0">
              <span className="text-green-400 font-bold text-lg">
                {vendor.name.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div className="min-w-0">
            <h3 className="text-content-primary font-semibold truncate">
              {vendor.name}
            </h3>
            {vendor.city && vendor.state && (
              <p className="text-content-tertiary text-sm">
                {vendor.city}, {vendor.state}
              </p>
            )}
          </div>
        </div>
        {connectionButton()}
      </div>

      {/* Trades */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        {vendor.trades.slice(0, 4).map((trade) => (
          <span
            key={trade}
            className="px-2 py-0.5 rounded-md bg-surface-tertiary text-content-secondary text-xs font-medium"
          >
            {trade}
          </span>
        ))}
        {vendor.trades.length > 4 && (
          <span className="px-2 py-0.5 rounded-md bg-surface-tertiary text-content-quaternary text-xs">
            +{vendor.trades.length - 4}
          </span>
        )}
      </div>

      {/* Description */}
      {vendor.description && (
        <p className="text-content-tertiary text-sm line-clamp-2 mb-3">
          {vendor.description}
        </p>
      )}

      {/* Stats Row */}
      <div className="flex items-center gap-4 flex-wrap text-sm">
        {/* Rating */}
        <div className="flex items-center gap-1">
          <div className="flex">{renderStars(vendor.avg_rating)}</div>
          <span className="text-content-secondary font-medium">
            {vendor.avg_rating > 0 ? vendor.avg_rating.toFixed(1) : "—"}
          </span>
          <span className="text-content-quaternary">
            ({vendor.total_ratings > 0
              ? t("reviews", { count: vendor.total_ratings })
              : t("noReviews")})
          </span>
        </div>

        {/* Service Radius */}
        <span className="text-content-quaternary">
          {t("serviceRadius", { miles: vendor.service_radius_miles })}
        </span>

        {/* Response Time */}
        {vendor.response_time_label && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-xs font-medium">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {t(`responseTime.${vendor.response_time_label}`)}
          </span>
        )}

        {/* Emergency */}
        {vendor.emergency_available && (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-red-500/10 text-red-400 text-xs font-medium">
            {t("emergency")}
          </span>
        )}
      </div>
    </div>
  );
}
