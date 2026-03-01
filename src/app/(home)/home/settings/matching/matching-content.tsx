"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { MatchWeightSliders } from "@/components/home/match-weight-sliders";

interface MatchingContentProps {
  preset: "balanced" | "best_price" | "best_vendor" | "fastest" | "custom";
  weights: {
    proximity: number;
    rating: number;
    availability: number;
    response: number;
    price: number;
  };
}

export function MatchingContent({ preset, weights }: MatchingContentProps) {
  const t = useTranslations("home.matching");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link
          href="/home/settings"
          className="inline-flex items-center gap-1 text-sm text-content-tertiary hover:text-content-primary mb-3"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {t("backToSettings")}
        </Link>
        <h1 className="text-2xl font-bold text-content-primary">
          {t("pageTitle")}
        </h1>
        <p className="text-sm text-content-tertiary mt-1">
          {t("pageDesc")}
        </p>
      </div>

      <MatchWeightSliders
        initialPreset={preset}
        initialWeights={weights}
      />

      {/* Explanation card */}
      <div className="bg-surface-primary border border-edge-primary rounded-xl p-5">
        <h3 className="text-sm font-semibold text-content-primary mb-2">
          {t("howItWorks")}
        </h3>
        <ul className="space-y-2 text-sm text-content-tertiary">
          <li className="flex items-start gap-2">
            <span className="text-rose-500 mt-0.5">•</span>
            {t("proximityExplain")}
          </li>
          <li className="flex items-start gap-2">
            <span className="text-rose-500 mt-0.5">•</span>
            {t("ratingExplain")}
          </li>
          <li className="flex items-start gap-2">
            <span className="text-rose-500 mt-0.5">•</span>
            {t("availabilityExplain")}
          </li>
          <li className="flex items-start gap-2">
            <span className="text-rose-500 mt-0.5">•</span>
            {t("responseExplain")}
          </li>
          <li className="flex items-start gap-2">
            <span className="text-rose-500 mt-0.5">•</span>
            {t("priceExplain")}
          </li>
        </ul>
      </div>
    </div>
  );
}
