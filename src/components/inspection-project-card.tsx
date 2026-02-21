"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useAppLocale } from "@/components/locale-provider";
import type { InspectionProject } from "@/lib/inspection-types";

interface InspectionProjectCardProps {
  project: InspectionProject;
  isShared?: boolean;
}

const statusStyles = {
  DRAFT: "bg-charcoal-100 text-charcoal-600",
  IN_PROGRESS: "bg-brand-100 text-brand-700",
  COMPLETE: "bg-brand-100 text-brand-800",
};

const borderColors = {
  DRAFT: "border-l-charcoal-400",
  IN_PROGRESS: "border-l-gold-500",
  COMPLETE: "border-l-brand-600",
};


export function InspectionProjectCard({ project, isShared }: InspectionProjectCardProps) {
  const t = useTranslations();
  const { locale } = useAppLocale();

  const formattedDate = new Date(project.updated_at).toLocaleDateString(
    locale === "es" ? "es" : "en-US",
    { month: "short", day: "numeric", year: "numeric" }
  );

  return (
    <Link
      href={`/inspections/${project.id}`}
      className={`block bg-surface-primary rounded-lg border border-edge-primary border-l-4 ${borderColors[project.status]} p-4 hover:shadow-lg hover:border-edge-secondary transition-all`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-content-primary">{project.name}</h3>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusStyles[project.status]}`}
            >
              {t(`review.statusLabels.${project.status}`)}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gold-100 text-gold-800">
              {t(`inspection.inspectionTypes.${project.inspection_type === "bank_ready" ? "bankReady" : "internal"}`)}
            </span>
            {isShared && (
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-700">
                {t("inspection.shared")}
              </span>
            )}
          </div>
          <p className="text-sm text-content-tertiary mt-0.5">
            {project.property_name}
          </p>
          {project.address && (
            <p className="text-xs text-content-muted mt-0.5">{project.address}</p>
          )}
          <span className="text-xs text-content-muted mt-1 block md:hidden">
            {formattedDate}
          </span>
        </div>
        <span className="text-xs text-content-muted whitespace-nowrap ml-4 hidden md:block">
          {formattedDate}
        </span>
      </div>
    </Link>
  );
}
