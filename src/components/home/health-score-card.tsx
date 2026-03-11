"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { HealthGrade, HealthConfidence } from "@/lib/home/health-score";

interface Props {
  score: number;
  grade: HealthGrade;
  confidence: HealthConfidence;
}

const GRADE_COLORS: Record<HealthGrade, string> = {
  A: "#22c55e",
  B: "#84cc16",
  C: "#eab308",
  D: "#f97316",
  F: "#ef4444",
};

export function HealthScoreCard({ score, grade, confidence }: Props) {
  const t = useTranslations("home.dashboard");
  const color = GRADE_COLORS[grade];

  // SVG ring gauge
  const size = 120;
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary p-6">
      <div className="flex items-center gap-6">
        {/* SVG ring gauge */}
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
          <svg width={size} height={size} className="-rotate-90">
            {/* Background ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke="currentColor"
              strokeWidth={strokeWidth}
              className="text-surface-tertiary"
            />
            {/* Score ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={color}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={offset}
              style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
            />
          </svg>
          {/* Center text */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-content-primary">{score}</span>
            <span className="text-xs font-semibold" style={{ color }}>
              {grade}
            </span>
          </div>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-content-primary">
            {t("healthScoreTitle")}
          </h3>
          <p className="text-sm text-content-tertiary mt-1">
            {t("healthScoreDesc")}
          </p>
          {/* Confidence label */}
          <div className="mt-2">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                confidence === "high"
                  ? "bg-green-500/10 text-green-400"
                  : confidence === "medium"
                    ? "bg-amber-500/10 text-amber-400"
                    : "bg-red-500/10 text-red-400"
              }`}
            >
              {t(`confidence_${confidence}`)}
            </span>
          </div>
          {confidence === "low" && (
            <Link
              href="/home/property"
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-rose-500 hover:text-rose-400 transition-colors"
            >
              {t("completeProfile")} →
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
