"use client";

import { useTranslations } from "next-intl";

export interface VendorBadges {
  insured: boolean;
  licensed: boolean;
  bonded: boolean;
  backgroundCheck: boolean;
}

interface Props {
  badges: VendorBadges;
  size?: "sm" | "md";
}

export function VendorTrustBadges({ badges, size = "sm" }: Props) {
  const t = useTranslations("home.vendors");

  const items: { key: keyof VendorBadges; label: string }[] = [
    { key: "insured", label: t("badgeInsured") },
    { key: "licensed", label: t("badgeLicensed") },
    { key: "bonded", label: t("badgeBonded") },
    { key: "backgroundCheck", label: t("badgeBackground") },
  ];

  const active = items.filter((item) => badges[item.key]);
  if (active.length === 0) return null;

  const textClass = size === "sm" ? "text-[10px]" : "text-xs";

  return (
    <div className="flex flex-wrap gap-1">
      {active.map((item) => (
        <span
          key={item.key}
          className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-green-500/10 text-green-400 ${textClass} font-medium`}
        >
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {item.label}
        </span>
      ))}
    </div>
  );
}
