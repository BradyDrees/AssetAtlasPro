"use client";

import { useTranslations } from "next-intl";

interface JobTypeBadgeProps {
  jobType: string | null | undefined;
  size?: "sm" | "md";
}

const JOB_TYPE_COLORS: Record<string, string> = {
  service: "bg-blue-500/20 text-blue-400",
  repair: "bg-orange-500/20 text-orange-400",
  emergency: "bg-red-500/20 text-red-400",
  maintenance: "bg-green-500/20 text-green-400",
  inspection: "bg-purple-500/20 text-purple-400",
  turn: "bg-cyan-500/20 text-cyan-400",
  estimate_visit: "bg-amber-500/20 text-amber-400",
};

export function JobTypeBadge({ jobType, size = "sm" }: JobTypeBadgeProps) {
  const t = useTranslations("vendor.jobs");

  if (!jobType) return null;

  const colorClass = JOB_TYPE_COLORS[jobType] ?? "bg-gray-500/20 text-gray-400";
  const sizeClass = size === "sm" ? "text-[10px] px-1.5 py-0.5" : "text-xs px-2 py-1";

  // Try to get translated label, fall back to formatted string
  const label = t(`jobTypes.${jobType}`, { defaultMessage: jobType.replace(/_/g, " ") });

  return (
    <span className={`inline-flex items-center rounded-md font-medium capitalize ${colorClass} ${sizeClass}`}>
      {label}
    </span>
  );
}
