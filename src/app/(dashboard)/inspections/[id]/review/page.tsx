import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { InspectionReviewContent } from "@/components/inspection-review-content";
import { InspectionExportButtons } from "@/components/inspection-export-buttons";
import { INSPECTION_GROUP_ORDER } from "@/lib/inspection-sections";
import { INSPECTION_TYPE_LABELS } from "@/lib/inspection-constants";
import type {
  InspectionProjectSectionWithDetails,
  InspectionFinding,
  InspectionUnit,
  InspectionCapture,
} from "@/lib/inspection-types";

export const dynamic = "force-dynamic";

const statusStyles: Record<string, string> = {
  DRAFT: "bg-charcoal-100 text-charcoal-600",
  IN_PROGRESS: "bg-brand-100 text-brand-700",
  COMPLETE: "bg-brand-100 text-brand-800",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  IN_PROGRESS: "In Progress",
  COMPLETE: "Complete",
};

export default async function InspectionReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  // Fire all queries in parallel for speed
  const [
    { data: project },
    { data: projectSections },
    { data: findingsData },
    { data: unitsData },
    { data: capturesData },
  ] = await Promise.all([
    supabase
      .from("inspection_projects")
      .select("*")
      .eq("id", id)
      .single(),
    supabase
      .from("inspection_project_sections")
      .select("*, section:inspection_sections(*)")
      .eq("project_id", id)
      .order("sort_order"),
    supabase
      .from("inspection_findings")
      .select("*")
      .eq("project_id", id)
      .order("sort_order"),
    supabase
      .from("inspection_units")
      .select("*")
      .eq("project_id", id)
      .order("building")
      .order("unit_number"),
    supabase
      .from("inspection_captures")
      .select("*")
      .eq("project_id", id),
  ]);

  if (!project) notFound();

  const sections = (projectSections ??
    []) as InspectionProjectSectionWithDetails[];
  const enabledSections = sections.filter((s) => s.enabled);
  const findings = (findingsData ?? []) as InspectionFinding[];
  const units = (unitsData ?? []) as InspectionUnit[];
  const allCaptures = (capturesData ?? []) as InspectionCapture[];

  // Compute metrics
  const totalFindings = findings.length;
  const immediateFindings = findings.filter(
    (f) => f.priority === 1
  ).length;
  const urgentFindings = findings.filter((f) => f.priority === 2).length;
  const shortTermFindings = findings.filter(
    (f) => f.priority === 3
  ).length;

  // Exposure calculation
  const exposureMap: Record<string, number> = {
    "500": 500,
    "1000": 1000,
    "2000": 2000,
    "3000": 3000,
  };

  let immediateExposure = 0;
  let shortTermExposure = 0;
  let totalExposure = 0;

  findings.forEach((f) => {
    const amount =
      f.exposure_bucket === "custom" && f.exposure_custom
        ? f.exposure_custom
        : f.exposure_bucket
        ? exposureMap[f.exposure_bucket] ?? 0
        : 0;

    totalExposure += amount;
    if (f.priority === 1) immediateExposure += amount;
    if (f.priority && f.priority <= 3) shortTermExposure += amount;
  });

  // Risk flags summary
  const riskFlagCounts: Record<string, number> = {};
  findings.forEach((f) => {
    (f.risk_flags ?? []).forEach((flag) => {
      riskFlagCounts[flag] = (riskFlagCounts[flag] ?? 0) + 1;
    });
  });

  // Sections missing condition rating or RUL (for bank-ready)
  const sectionsWithoutRating = enabledSections.filter(
    (s) => !s.section.is_unit_mode && s.condition_rating === null
  );
  const sectionsWithoutRul = enabledSections.filter(
    (s) => !s.section.is_unit_mode && s.rul_bucket === null
  );

  // Group sections for display
  const groupedSections = INSPECTION_GROUP_ORDER.map((groupName) => ({
    group_name: groupName,
    sections: enabledSections.filter(
      (s) => s.section.group_name === groupName
    ),
  })).filter((g) => g.sections.length > 0);

  return (
    <div>
      {/* Header — gradient banner */}
      <div className="bg-[radial-gradient(ellipse_at_top_left,_var(--brand-900)_0%,_transparent_50%),radial-gradient(ellipse_at_bottom_right,_var(--brand-900)_0%,_var(--charcoal-950)_60%)] bg-charcoal-900 -mx-4 -mt-4 md:-mx-6 md:-mt-6 px-4 py-5 md:px-6 rounded-b-xl mb-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-charcoal-400 mb-3">
          <Link
            href="/inspections"
            className="hover:text-white transition-colors"
          >
            Inspections
          </Link>
          <span className="text-charcoal-600">/</span>
          <Link
            href={`/inspections/${id}`}
            className="hover:text-white transition-colors"
          >
            {project.name}
          </Link>
          <span className="text-charcoal-600">/</span>
          <span className="text-white font-medium">Review</span>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={`/inspections/${id}`}
            className="p-1.5 text-charcoal-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            title="Back to inspection"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">
              Review &amp; Export
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-brand-200">
                {project.name} — {project.property_name}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-white/20 text-white">
                {statusLabels[project.status]}
              </span>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gold-500/30 text-gold-200">
                {INSPECTION_TYPE_LABELS[project.inspection_type]}
              </span>
            </div>
          </div>
        </div>
      </div>

      <InspectionReviewContent
        project={project}
        groupedSections={groupedSections}
        findings={findings}
        units={units}
        allCaptures={allCaptures}
        metrics={{
          totalFindings,
          immediateFindings,
          urgentFindings,
          shortTermFindings,
          immediateExposure,
          shortTermExposure,
          totalExposure,
          totalUnits: units.length,
          totalCaptures: allCaptures.length,
          riskFlagCounts,
          sectionsWithoutRating: sectionsWithoutRating.length,
          sectionsWithoutRul: sectionsWithoutRul.length,
        }}
      />

      <div className="mt-6">
        <InspectionExportButtons
          projectId={id}
          projectCode={project.name}
        />
      </div>
    </div>
  );
}
