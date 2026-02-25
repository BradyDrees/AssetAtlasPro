"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";

export function AcquireDashboardContent({
  ddCount,
  daCount,
}: {
  ddCount: number;
  daCount: number;
}) {
  const t = useTranslations();

  const modules = [
    {
      title: t("nav.ddProjects"),
      description: t("dashboard.ddDescription"),
      href: "/acquire/projects",
      count: ddCount,
      countLabel: t("dashboard.projects"),
      gradient: "from-charcoal-900 to-blue-800",
      iconColor: "text-blue-400",
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
      title: t("nav.dealAnalysis"),
      description: t("dashboard.daDescription"),
      href: "/acquire/deal-analysis",
      count: daCount,
      countLabel: t("dealAnalysis.deals"),
      gradient: "from-charcoal-900 to-blue-900",
      iconColor: "text-blue-300",
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

  return (
    <div>
      <div className="mb-8 bg-gradient-to-r from-blue-900 via-charcoal-950 to-blue-900 -mx-4 -mt-4 md:-mx-6 md:-mt-6 px-4 py-6 md:px-6 rounded-b-xl flex flex-col items-center justify-center overflow-visible">
        <Image
          src="/logo-dark.png"
          alt="Asset Atlas"
          width={1200}
          height={530}
          className="h-36 md:h-48 w-auto logo-fade -my-6"
        />
        <p className="text-blue-300 text-sm font-semibold mt-2">
          {t("tiers.acquireTagline")}
        </p>
        <p className="text-charcoal-300 text-sm mt-1 text-center">
          {t("dashboard.selectModule")}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 max-w-2xl mx-auto">
        {modules.map((m) => (
          <Link
            key={m.title}
            href={m.href}
            className="group block bg-surface-primary rounded-xl border border-edge-primary shadow-sm hover:shadow-md hover:border-blue-300 transition-all overflow-hidden"
          >
            <div
              className={`bg-gradient-to-r ${m.gradient} px-5 py-4 flex items-center gap-3`}
            >
              <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center">
                <svg
                  className={`w-5 h-5 ${m.iconColor}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {m.icon}
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-white group-hover:text-blue-200 transition-colors">
                {m.title}
              </h2>
            </div>

            <div className="px-5 py-4">
              <p className="text-sm text-content-quaternary mb-3 line-clamp-2">
                {m.description}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-content-primary">
                  {m.count}
                </span>
                <span className="text-xs text-content-muted uppercase tracking-wide">
                  {m.countLabel}
                </span>
              </div>
            </div>

            <div className="px-5 py-3 border-t border-edge-tertiary bg-surface-secondary/50">
              <span className="text-sm font-medium text-blue-500 group-hover:text-blue-400 transition-colors inline-flex items-center gap-1">
                {t("dashboard.openModule", { title: m.title })}{" "}
                <span
                  aria-hidden="true"
                  className="group-hover:translate-x-0.5 transition-transform"
                >
                  &rarr;
                </span>
              </span>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
