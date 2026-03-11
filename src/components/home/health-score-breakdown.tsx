"use client";

import { useTranslations } from "next-intl";
import type { SystemBreakdown } from "@/lib/home/health-score";

interface Props {
  breakdown: SystemBreakdown[];
}

const BAR_COLORS: Record<string, string> = {
  A: "bg-green-500",
  B: "bg-lime-500",
  C: "bg-amber-500",
  D: "bg-orange-500",
  F: "bg-red-500",
};

function gradeFromScore(score: number) {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

export function HealthScoreBreakdown({ breakdown }: Props) {
  const t = useTranslations("home.dashboard");

  const systemLabels: Record<string, string> = {
    hvac: t("systemHvac"),
    roof: t("systemRoof"),
    water_heater: t("systemWaterHeater"),
    electrical_panel: t("systemElectrical"),
  };

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary p-6">
      <h3 className="text-lg font-semibold text-content-primary mb-4">
        {t("healthBreakdownTitle")}
      </h3>
      <div className="space-y-4">
        {breakdown.map((sys) => {
          const grade = gradeFromScore(sys.score);
          const barColor = BAR_COLORS[grade] ?? "bg-surface-tertiary";
          const label = systemLabels[sys.system] ?? sys.system;

          return (
            <div key={sys.system}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-content-primary font-medium">
                  {label}
                </span>
                <div className="flex items-center gap-2">
                  {!sys.known && (
                    <span className="text-[10px] text-content-quaternary">
                      {t("healthUnknown")}
                    </span>
                  )}
                  <span className="text-sm font-semibold text-content-primary">
                    {sys.score}
                  </span>
                </div>
              </div>
              <div className="w-full h-2 rounded-full bg-surface-tertiary overflow-hidden">
                <div
                  className={`h-full rounded-full ${barColor}`}
                  style={{
                    width: `${sys.score}%`,
                    transition: "width 0.6s ease-out",
                  }}
                />
              </div>
              {sys.known && sys.age !== null && (
                <p className="text-[10px] text-content-quaternary mt-0.5">
                  {t("healthAge", { age: sys.age, lifespan: sys.lifespan })}
                </p>
              )}
              {/* Bonus badges */}
              <div className="flex gap-1 mt-1">
                {sys.hasPhotos && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400">
                    {t("healthBonusPhoto")}
                  </span>
                )}
                {sys.hasDocs && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400">
                    {t("healthBonusDoc")}
                  </span>
                )}
                {sys.hasRecentWo && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-green-500/10 text-green-400">
                    {t("healthBonusWo")}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
