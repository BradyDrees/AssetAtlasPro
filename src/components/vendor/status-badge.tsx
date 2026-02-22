"use client";

import { useTranslations } from "next-intl";
import type { WoStatus } from "@/lib/vendor/types";
import { WO_STATUS_COLORS } from "@/lib/vendor/work-order-types";

interface StatusBadgeProps {
  status: WoStatus;
  size?: "sm" | "md";
}

export function StatusBadge({ status, size = "sm" }: StatusBadgeProps) {
  const t = useTranslations("vendor.jobs");
  const colorClass = WO_STATUS_COLORS[status] || "bg-gray-100 text-gray-700";
  const sizeClass = size === "sm" ? "px-2 py-0.5 text-xs" : "px-3 py-1 text-sm";

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium whitespace-nowrap ${colorClass} ${sizeClass}`}
    >
      {t(`status.${status}`)}
    </span>
  );
}
