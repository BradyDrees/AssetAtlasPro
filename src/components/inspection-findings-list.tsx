"use client";

import { FindingCard } from "@/components/inspection-finding-card";
import type {
  InspectionFinding,
  InspectionCapture,
  InspectionType,
} from "@/lib/inspection-types";

interface InspectionFindingsListProps {
  findings: InspectionFinding[];
  captures: InspectionCapture[];
  projectId: string;
  projectSectionId: string;
  sectionSlug: string;
  inspectionType: InspectionType;
}

export function InspectionFindingsList({
  findings,
  captures,
  projectId,
  projectSectionId,
  sectionSlug,
  inspectionType,
}: InspectionFindingsListProps) {
  if (findings.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg border border-gray-200 p-6 text-center text-sm text-gray-500">
        No findings yet. Use the checklist above to add findings.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">
        Findings ({findings.length})
      </h3>
      {findings.map((finding) => (
        <FindingCard
          key={finding.id}
          finding={finding}
          captures={captures.filter((c) => c.finding_id === finding.id)}
          projectId={projectId}
          projectSectionId={projectSectionId}
          sectionSlug={sectionSlug}
          inspectionType={inspectionType}
        />
      ))}
    </div>
  );
}
