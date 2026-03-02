"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { EnrichedPmVendor } from "@/lib/vendor/types";

interface PmVendorCardProps {
  vendor: EnrichedPmVendor;
  onViewDetail: (vendor: EnrichedPmVendor) => void;
  onAction: (vendor: EnrichedPmVendor, action: string) => void;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-500/20 text-green-400 border-green-500/30",
  pending: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  suspended: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  terminated: "bg-red-500/20 text-red-400 border-red-500/30",
};

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

export function PmVendorCard({ vendor, onViewDetail, onAction }: PmVendorCardProps) {
  const t = useTranslations("vendor.clients");

  const credDot = vendor.credential_summary.missing_critical
    ? "bg-red-400"
    : vendor.credential_summary.warnings.length > 0
      ? "bg-yellow-400"
      : "bg-green-400";

  return (
    <div
      className="bg-surface-primary rounded-xl border border-edge-primary p-5 hover:border-edge-secondary transition-colors cursor-pointer"
      onClick={() => onViewDetail(vendor)}
    >
      <div className="flex items-start justify-between">
        {/* Left: Logo/initials + info */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-lg bg-surface-secondary border border-edge-secondary flex items-center justify-center flex-shrink-0 text-content-tertiary font-semibold text-sm">
            {vendor.vendor_logo ? (
              <img
                src={vendor.vendor_logo}
                alt={vendor.vendor_name}
                className="w-10 h-10 rounded-lg object-cover"
              />
            ) : (
              vendor.vendor_name.slice(0, 2).toUpperCase()
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-medium text-content-primary truncate">
                {vendor.vendor_name}
              </h3>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                  STATUS_COLORS[vendor.status] ?? STATUS_COLORS.pending
                }`}
              >
                {t(`status.${vendor.status}`)}
              </span>
              {/* Credential compliance dot */}
              <span
                className={`w-2 h-2 rounded-full ${credDot}`}
                title={
                  vendor.credential_summary.warnings.length > 0
                    ? vendor.credential_summary.warnings.join(", ")
                    : t("pmVendors.credentialsOk")
                }
              />
            </div>

            {vendor.vendor_email && (
              <p className="text-xs text-content-tertiary mt-0.5">
                {vendor.vendor_email}
              </p>
            )}

            {/* Trades */}
            {vendor.trades.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {vendor.trades.slice(0, 4).map((trade) => (
                  <span
                    key={trade}
                    className="px-2 py-0.5 rounded-full text-[10px] bg-surface-secondary text-content-tertiary border border-edge-secondary"
                  >
                    {trade}
                  </span>
                ))}
                {vendor.trades.length > 4 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] text-content-quaternary">
                    +{vendor.trades.length - 4}
                  </span>
                )}
              </div>
            )}

            {/* Stats row */}
            <div className="flex items-center gap-4 mt-2 text-xs text-content-quaternary">
              <span>
                {vendor.stats.active_jobs} {t("activeJobs")}
              </span>
              <span>
                {vendor.stats.total_jobs} {t("totalJobs")}
              </span>
              <span>{formatCents(vendor.stats.total_spent_cents)}</span>
            </div>
          </div>
        </div>

        {/* Right: Three-dot menu */}
        <VendorCardMenu vendor={vendor} onAction={onAction} />
      </div>
    </div>
  );
}

function VendorCardMenu({
  vendor,
  onAction,
}: {
  vendor: EnrichedPmVendor;
  onAction: (vendor: EnrichedPmVendor, action: string) => void;
}) {
  const t = useTranslations("vendor.clients");
  const [open, setOpen] = useState(false);

  const menuItems: { key: string; label: string; color?: string }[] = [
    { key: "view", label: t("pmVendors.viewProfile") },
    { key: "jobs", label: t("pmVendors.viewJobs") },
  ];

  if (vendor.status === "pending") {
    menuItems.push({ key: "resend", label: t("pmVendors.resendInvite") });
  }
  if (vendor.status === "active") {
    menuItems.push({
      key: "suspend",
      label: t("pmVendors.suspend"),
      color: "text-yellow-400",
    });
  }
  if (vendor.status === "suspended") {
    menuItems.push({
      key: "reactivate",
      label: t("pmVendors.reactivate"),
    });
  }
  if (vendor.status !== "terminated") {
    menuItems.push({
      key: "terminate",
      label: t("pmVendors.terminate"),
      color: "text-red-400",
    });
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        className="p-1.5 rounded-lg hover:bg-surface-secondary text-content-tertiary"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 6.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 12.75a.75.75 0 110-1.5.75.75 0 010 1.5zM12 18.75a.75.75 0 110-1.5.75.75 0 010 1.5z"
          />
        </svg>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
            }}
          />
          <div className="absolute right-0 top-full mt-1 z-20 w-44 rounded-lg bg-surface-secondary border border-edge-primary shadow-lg py-1">
            {menuItems.map((item) => (
              <button
                key={item.key}
                onClick={(e) => {
                  e.stopPropagation();
                  setOpen(false);
                  onAction(vendor, item.key);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-surface-tertiary ${
                  item.color ?? "text-content-primary"
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
