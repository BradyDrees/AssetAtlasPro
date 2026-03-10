"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { dismissMaintenanceAlert } from "@/app/actions/home-property";

interface MaintenanceAlert {
  id: string;
  system_type: string;
  threshold_percent: number;
  source_snapshot: {
    age: number;
    minLifespan: number;
    thresholdAge: number;
  } | null;
}

interface MaintenanceAlertCardProps {
  alerts: MaintenanceAlert[];
}

const SYSTEM_ICONS: Record<string, string> = {
  hvac: "M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636",
  water_heater: "M15.362 5.214A8.252 8.252 0 0112 21 8.25 8.25 0 016.038 7.048 6.51 6.51 0 0012 2.25a6.51 6.51 0 013.362 2.964z",
  roof: "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75",
};

const SYSTEM_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  hvac: { bg: "bg-orange-500/10", text: "text-orange-400", border: "border-orange-500/30" },
  water_heater: { bg: "bg-red-500/10", text: "text-red-400", border: "border-red-500/30" },
  roof: { bg: "bg-amber-500/10", text: "text-amber-400", border: "border-amber-500/30" },
};

export function MaintenanceAlertCard({ alerts }: MaintenanceAlertCardProps) {
  const t = useTranslations("home.property");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const visibleAlerts = alerts.filter((a) => !dismissedIds.has(a.id));

  if (visibleAlerts.length === 0) return null;

  const handleDismiss = (alertId: string) => {
    startTransition(async () => {
      const result = await dismissMaintenanceAlert(alertId);
      if (!result.error) {
        setDismissedIds((prev) => new Set([...prev, alertId]));
      }
    });
  };

  const handleRequestService = (systemType: string) => {
    // Navigate to new WO wizard with pre-selected trade
    const trade = systemType === "water_heater" ? "plumbing" : systemType;
    router.push(`/home/work-orders/new?trade=${trade}`);
  };

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold text-content-primary flex items-center gap-2">
        <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        {t("maintenanceAlerts")}
      </h3>

      {visibleAlerts.map((alert) => {
        const colors = SYSTEM_COLORS[alert.system_type] ?? SYSTEM_COLORS.hvac;
        const iconPath = SYSTEM_ICONS[alert.system_type] ?? SYSTEM_ICONS.hvac;
        const snapshot = alert.source_snapshot;
        const age = snapshot?.age ?? 0;
        const minLifespan = snapshot?.minLifespan ?? 15;
        const pctUsed = alert.threshold_percent;

        return (
          <div
            key={alert.id}
            className={`${colors.bg} border ${colors.border} rounded-xl p-4`}
          >
            <div className="flex items-start gap-3">
              <div className={`flex-shrink-0 p-2 rounded-lg ${colors.bg}`}>
                <svg className={`w-5 h-5 ${colors.text}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d={iconPath} />
                </svg>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className={`text-sm font-semibold ${colors.text}`}>
                    {t(`alertSystem.${alert.system_type}`)}
                  </h4>
                  <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${colors.bg} ${colors.text}`}>
                    {pctUsed}% {t("alertLifeUsed")}
                  </span>
                </div>

                <p className="text-xs text-content-tertiary mb-2">
                  {t("alertAgeMessage", {
                    age,
                    lifespan: minLifespan,
                  })}
                </p>

                {/* Progress bar */}
                <div className="h-1.5 bg-surface-tertiary rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full ${
                      pctUsed >= 100 ? "bg-red-500" : "bg-amber-500"
                    }`}
                    style={{ width: `${Math.min(pctUsed, 100)}%` }}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleRequestService(alert.system_type)}
                    className="px-3 py-1.5 text-xs font-medium bg-rose-600 hover:bg-rose-700 text-white rounded-lg transition-colors"
                  >
                    {t("alertRequestService")}
                  </button>
                  <button
                    onClick={() => handleDismiss(alert.id)}
                    disabled={isPending}
                    className="px-3 py-1.5 text-xs text-content-quaternary hover:text-content-secondary transition-colors disabled:opacity-50"
                  >
                    {t("alertDismiss")}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
