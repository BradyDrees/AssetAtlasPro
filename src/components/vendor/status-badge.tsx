"use client";

import { useTranslations } from "next-intl";
import type { WoStatus } from "@/lib/vendor/types";
import { WO_STATUS_COLORS } from "@/lib/vendor/work-order-types";

interface StatusBadgeProps {
  status: WoStatus;
  size?: "sm" | "md";
}

/** Convert snake_case to Title Case for display when no translation exists */
function formatStatusFallback(status: string): string {
  return status
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const t = useTranslations("vendor.jobs");
  const colorClass = WO_STATUS_COLORS[status] || "bg-gray-100 text-gray-700";
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";

  // Use translation if available, otherwise format the raw key nicely
  const label = t.has(`status.${status}`)
    ? t(`status.${status}`)
    : formatStatusFallback(status);

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium whitespace-nowrap ${colorClass} ${sizeClass}`}
    >
      {label}
    </span>
  );
}
