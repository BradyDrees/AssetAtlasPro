"use client";

import { useTranslations } from "next-intl";
import { usePathname } from "next/navigation";
import { useOffline } from "@/components/offline-provider";
import { InspectionSectionOffline } from "@/components/inspection-section-offline";

function isNetworkError(error: Error | null): boolean {
  if (!error) return false;
  return /fetch|NetworkError|Failed to fetch|ECONN|timeout|NEXT_NOT_FOUND/i.test(
    error.message
  );
}

export default function SectionError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations();
  const { isFieldMode } = useOffline();
  const pathname = usePathname();

  // Extract projectId and sectionId from the URL
  // Pattern: /inspections/{projectId}/sections/{sectionId}
  const segments = pathname.split("/");
  const inspIdx = segments.indexOf("inspections");
  const projectId = inspIdx >= 0 ? segments[inspIdx + 1] : "";
  const secIdx = segments.indexOf("sections");
  const sectionId = secIdx >= 0 ? segments[secIdx + 1] : "";

  // Show offline renderer when in field mode or when it's a network-related error
  if (isFieldMode || isNetworkError(error) || !navigator.onLine) {
    return (
      <InspectionSectionOffline
        projectId={projectId}
        sectionId={sectionId}
        onRetry={reset}
      />
    );
  }

  // Normal error UI for non-network errors
  return (
    <div className="bg-surface-primary rounded-lg border border-red-500/30 p-8 text-center">
      <svg
        className="w-12 h-12 text-red-400 mx-auto mb-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={1.5}
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
        />
      </svg>
      <h2 className="text-lg font-semibold text-content-primary mb-2">
        {t("common.somethingWentWrong")}
      </h2>
      <p className="text-sm text-content-quaternary mb-4">
        {error?.message || t("dashboard.unexpectedError")}
      </p>
      <button
        onClick={reset}
        className="px-4 py-2 bg-brand-600 text-white text-sm rounded-md hover:bg-brand-700 transition-colors"
      >
        {t("common.retry")}
      </button>
    </div>
  );
}
