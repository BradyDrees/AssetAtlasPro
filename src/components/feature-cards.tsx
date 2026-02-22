"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";

const featureKeys = ["dueDiligence", "inspections", "unitTurns", "dealAnalysis"] as const;

const featureStyles = [
  {
    iconBg: "bg-brand-600/20",
    iconColor: "text-brand-400",
    accentColor: "text-brand-400",
    accentHover: "group-hover:text-brand-300",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4"
      />
    ),
  },
  {
    iconBg: "bg-gold-500/20",
    iconColor: "text-gold-400",
    accentColor: "text-gold-400",
    accentHover: "group-hover:text-gold-300",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
      />
    ),
  },
  {
    iconBg: "bg-brand-400/20",
    iconColor: "text-brand-300",
    accentColor: "text-brand-300",
    accentHover: "group-hover:text-brand-200",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
      />
    ),
  },
  {
    iconBg: "bg-gold-500/20",
    iconColor: "text-gold-300",
    accentColor: "text-gold-400",
    accentHover: "group-hover:text-gold-300",
    icon: (
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M3 3v18h18M7 16l4-4 4 4 5-6"
      />
    ),
  },
];

export function FeatureCards() {
  const [expanded, setExpanded] = useState<number | null>(null);
  const t = useTranslations();

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
      {featureKeys.map((key, i) => {
        const isOpen = expanded === i;
        const f = featureStyles[i];
        return (
          <button
            key={key}
            type="button"
            onClick={() => setExpanded(isOpen ? null : i)}
            className="group bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6 hover:bg-white/8 hover:border-white/20 transition-all cursor-pointer text-left"
          >
            <div className={`w-12 h-12 ${f.iconBg} rounded-xl flex items-center justify-center mb-4`}>
              <svg className={`w-6 h-6 ${f.iconColor}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {f.icon}
              </svg>
            </div>

            <h3 className="text-lg font-semibold text-white mb-2 transition-colors">
              {t(`landing.features.${key}.title`)}
            </h3>

            <p className="text-sm text-charcoal-300 leading-relaxed">
              {t(`landing.features.${key}.summary`)}
            </p>

            {/* Expandable detail */}
            <div
              className={`grid transition-all duration-300 ease-in-out ${
                isOpen ? "grid-rows-[1fr] opacity-100 mt-4" : "grid-rows-[0fr] opacity-0 mt-0"
              }`}
            >
              <div className="overflow-hidden">
                <p className="text-sm text-charcoal-200 leading-relaxed border-t border-white/10 pt-4">
                  {t(`landing.features.${key}.detail`)}
                </p>
              </div>
            </div>

            <span className={`inline-flex items-center gap-1 mt-4 text-xs font-medium ${f.accentColor} transition-colors`}>
              {isOpen ? t("common.showLess") : t("common.learnMore")}{" "}
              <span
                aria-hidden="true"
                className={`inline-block transition-transform duration-200 ${isOpen ? "rotate-90" : ""}`}
              >
                &rarr;
              </span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
