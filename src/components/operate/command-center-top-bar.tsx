"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

interface CommandCenterTopBarProps {
  today: string;
  alertsCount: number;
  locale: string;
}

export function CommandCenterTopBar({
  today,
  alertsCount,
  locale,
}: CommandCenterTopBarProps) {
  const t = useTranslations("operate.dashboard");

  // Format date for display
  const dateObj = new Date(today + "T12:00:00"); // noon to avoid timezone issues
  const formatted = dateObj.toLocaleDateString(locale === "es" ? "es-US" : "en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="bg-gradient-to-r from-green-900 via-charcoal-950 to-green-900 -mx-4 -mt-4 md:-mx-6 md:-mt-6 px-4 py-3 md:px-6 rounded-b-xl flex items-center justify-between gap-3">
      {/* Left: Title + date */}
      <div className="min-w-0">
        <h1 className="text-lg font-bold text-white truncate">
          {t("title")}
        </h1>
        <p className="text-green-300/80 text-xs capitalize truncate">
          {formatted}
        </p>
      </div>

      {/* Center: Alerts */}
      <div className="flex items-center gap-2">
        {alertsCount > 0 ? (
          <span className="inline-flex items-center gap-1.5 bg-red-500/20 border border-red-500/30 text-red-300 px-3 py-1 rounded-full text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            {t("alerts", { count: alertsCount })}
          </span>
        ) : (
          <span className="text-green-300/70 text-sm">
            {t("noAlerts")}
          </span>
        )}
      </div>

      {/* Right: Quick Add */}
      <Link
        href="/operate/work-orders/new"
        className="flex-shrink-0 bg-green-600 hover:bg-green-500 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
      >
        + {t("quickAdd")}
      </Link>
    </div>
  );
}
