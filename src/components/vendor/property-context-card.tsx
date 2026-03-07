"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { getPropertyContextForWo } from "@/app/actions/vendor-property-context";
import type { PropertyContext } from "@/lib/vendor/property-context-types";

interface PropertyContextCardProps {
  woId: string;
}

export function PropertyContextCard({ woId }: PropertyContextCardProps) {
  const t = useTranslations("vendor.jobs.property");
  const [data, setData] = useState<PropertyContext | null>(null);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);
  const [showCodes, setShowCodes] = useState(false);

  useEffect(() => {
    async function load() {
      const res = await getPropertyContextForWo(woId);
      if (res.data) setData(res.data);
      setLoading(false);
    }
    load();
  }, [woId]);

  if (loading || !data) return null;

  const hasCodes = data.access_codes || data.gate_code || data.lockbox_code;
  const currentYear = new Date().getFullYear();

  function getAgeBadgeColor(age: number | null): string {
    if (age === null) return "bg-surface-secondary text-content-tertiary";
    if (age <= 5) return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    if (age <= 15) return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400";
    return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
  }

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary overflow-hidden">
      <button
        type="button"
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-surface-secondary transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg
            className="w-4 h-4 text-brand-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819"
            />
          </svg>
          <span className="text-sm font-medium text-content-primary">{t("title")}</span>
        </div>
        <div className="flex items-center gap-2">
          {data.past_job_count > 0 && (
            <span className="text-xs text-content-quaternary">
              {t("pastJobs", { count: data.past_job_count })}
            </span>
          )}
          <svg
            className={`w-4 h-4 text-content-quaternary transition-transform ${
              collapsed ? "" : "rotate-180"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 8.25l-7.5 7.5-7.5-7.5"
            />
          </svg>
        </div>
      </button>

      {!collapsed && (
        <div className="px-4 pb-4 space-y-3 border-t border-edge-primary pt-3">
          {/* Property basics */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            {data.property_type && (
              <div>
                <span className="text-content-quaternary">{t("type")}</span>
                <p className="text-content-secondary font-medium">{data.property_type}</p>
              </div>
            )}
            {data.year_built && (
              <div>
                <span className="text-content-quaternary">{t("yearBuilt")}</span>
                <p className="text-content-secondary font-medium">
                  {data.year_built} ({currentYear - data.year_built} {t("yearsOld")})
                </p>
              </div>
            )}
            {data.sqft && (
              <div>
                <span className="text-content-quaternary">{t("sqft")}</span>
                <p className="text-content-secondary font-medium">
                  {data.sqft.toLocaleString()} ft²
                </p>
              </div>
            )}
            {(data.beds || data.baths) && (
              <div>
                <span className="text-content-quaternary">{t("bedsBaths")}</span>
                <p className="text-content-secondary font-medium">
                  {data.beds ?? "—"} {t("bd")} / {data.baths ?? "—"} {t("ba")}
                </p>
              </div>
            )}
          </div>

          {/* Systems */}
          {data.systems.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-content-tertiary mb-1.5">{t("systems")}</p>
              <div className="space-y-1.5">
                {data.systems.map((sys) => (
                  <div
                    key={sys.system_type}
                    className="flex items-center justify-between bg-surface-secondary rounded-lg px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-content-primary">
                        {sys.system_type}
                      </p>
                      {sys.model && (
                        <p className="text-xs text-content-quaternary truncate">
                          {sys.model}
                        </p>
                      )}
                    </div>
                    <span
                      className={`shrink-0 text-xs font-semibold px-2 py-0.5 rounded-full ${getAgeBadgeColor(
                        sys.age_years
                      )}`}
                    >
                      {sys.age_years != null
                        ? `${sys.age_years} ${t("yrs")}`
                        : t("unknownAge")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Access codes (tap to reveal) */}
          {hasCodes && (
            <div>
              <button
                type="button"
                onClick={() => setShowCodes(!showCodes)}
                className="text-xs font-semibold text-brand-500 hover:text-brand-400 transition-colors"
              >
                {showCodes ? t("hideCodes") : t("showCodes")}
              </button>
              {showCodes && (
                <div className="grid grid-cols-2 gap-2 mt-1.5 text-xs">
                  {data.gate_code && (
                    <div>
                      <span className="text-content-quaternary">{t("gateCode")}</span>
                      <p className="text-content-secondary font-mono font-medium">
                        {data.gate_code}
                      </p>
                    </div>
                  )}
                  {data.lockbox_code && (
                    <div>
                      <span className="text-content-quaternary">{t("lockboxCode")}</span>
                      <p className="text-content-secondary font-mono font-medium">
                        {data.lockbox_code}
                      </p>
                    </div>
                  )}
                  {data.access_codes && (
                    <div className="col-span-2">
                      <span className="text-content-quaternary">{t("alarmCode")}</span>
                      <p className="text-content-secondary font-mono font-medium">
                        {data.access_codes}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Pet warning */}
          {data.pet_info && (
            <div className="flex items-start gap-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg px-3 py-2 border border-yellow-200 dark:border-yellow-800">
              <span className="text-sm">⚠️</span>
              <div>
                <p className="text-xs font-semibold text-yellow-700 dark:text-yellow-400">
                  {t("petWarning")}
                </p>
                <p className="text-xs text-yellow-600 dark:text-yellow-300">
                  {data.pet_info}
                </p>
              </div>
            </div>
          )}

          {/* Parking */}
          {data.parking_notes && (
            <div className="text-xs">
              <span className="text-content-quaternary">{t("parking")}</span>
              <p className="text-content-secondary">{data.parking_notes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
