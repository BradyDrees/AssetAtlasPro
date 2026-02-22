"use client";

import { useTranslations } from "next-intl";
import type { WoPriority } from "@/lib/vendor/types";
import { WO_PRIORITY_DOT_COLORS } from "@/lib/vendor/work-order-types";

interface PriorityDotProps {
  priority: WoPriority;
  showLabel?: boolean;
}

export function PriorityDot({ priority, showLabel = false }: PriorityDotProps) {
  const t = useTranslations("vendor.jobs");

  if (priority === "normal" && !showLabel) return null;

  const dotColor = WO_PRIORITY_DOT_COLORS[priority];

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full ${dotColor}`} />
      {showLabel && (
        <span
          className={`text-xs font-medium ${
            priority === "emergency"
              ? "text-red-600 dark:text-red-400"
              : priority === "urgent"
                ? "text-amber-600 dark:text-amber-400"
                : "text-content-tertiary"
          }`}
        >
          {t(`priority.${priority}`)}
        </span>
      )}
    </span>
  );
}
