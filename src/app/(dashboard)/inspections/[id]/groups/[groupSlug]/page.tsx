import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { InspectionGroupChecklist } from "@/components/inspection-group-checklist";
import {
  INSPECTION_SLUG_TO_GROUP,
  INSPECTION_GROUP_SLUGS,
  INSPECTION_GROUP_ORDER,
} from "@/lib/inspection-sections";
import { INSPECTION_TYPE_LABELS } from "@/lib/inspection-constants";
import { getTranslations } from "next-intl/server";
import { INSPECTION_GROUP_KEYS } from "@/lib/translate-sections";
import type {
  InspectionProjectSectionWithDetails,
  InspectionChecklistItem,
  InspectionFinding,
  InspectionCapture,
} from "@/lib/inspection-types";

export const dynamic = "force-dynamic";

export default async function InspectionGroupPage({
  params,
}: {
  params: Promise<{ id: string; groupSlug: string }>;
}) {
  const { id: projectId, groupSlug } = await params;
  const t = await getTranslations();

  // Resolve slug → group name
  const groupName = INSPECTION_SLUG_TO_GROUP[groupSlug];
  if (!groupName) notFound();

  const supabase = await createClient();

  // Fetch project
  const { data: project } = await supabase
    .from("inspection_projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (!project) notFound();

  // Fetch all enabled project sections in this group, joined with master section
  const { data: projectSections } = await supabase
    .from("inspection_project_sections")
    .select(
      `
      *,
      section:inspection_sections(*)
    `
    )
    .eq("project_id", projectId)
    .eq("enabled", true)
    .order("sort_order");

  // Filter to only sections in this group
  const groupSections = (
    (projectSections ?? []) as InspectionProjectSectionWithDetails[]
  ).filter((ps) => ps.section.group_name === groupName);

  if (groupSections.length === 0) notFound();

  // Batch fetch: checklist items for all sections in this group
  const sectionIds = groupSections.map((ps) => ps.section_id);
  const { data: allChecklistItems } = await supabase
    .from("inspection_checklist_items")
    .select("*")
    .in("section_id", sectionIds)
    .order("sort_order");

  // Batch fetch: findings for all project sections in this group
  const projectSectionIds = groupSections.map((ps) => ps.id);
  const { data: allFindings } = await supabase
    .from("inspection_findings")
    .select("*")
    .in("project_section_id", projectSectionIds)
    .order("sort_order");

  // Batch fetch: captures for all project sections in this group
  const { data: allCaptures } = await supabase
    .from("inspection_captures")
    .select("*")
    .in("project_section_id", projectSectionIds)
    .order("sort_order");

  // Build section data for the component
  const sectionsData = groupSections.map((ps) => ({
    projectSection: ps,
    checklistItems: ((allChecklistItems ?? []) as InspectionChecklistItem[]).filter(
      (ci) => ci.section_id === ps.section_id
    ),
    findings: ((allFindings ?? []) as InspectionFinding[]).filter(
      (f) => f.project_section_id === ps.id
    ),
    captures: ((allCaptures ?? []) as InspectionCapture[]).filter(
      (c) => c.project_section_id === ps.id
    ),
  }));

  // Calculate next group for navigation
  const currentGroupIdx = INSPECTION_GROUP_ORDER.indexOf(
    groupName as (typeof INSPECTION_GROUP_ORDER)[number]
  );

  // Find next non-unit group that has enabled sections
  const allEnabledSections = (
    (projectSections ?? []) as InspectionProjectSectionWithDetails[]
  );
  let nextGroupSlug: string | null = null;
  let nextGroupName: string | null = null;
  for (let i = currentGroupIdx + 1; i < INSPECTION_GROUP_ORDER.length; i++) {
    const candidateGroup = INSPECTION_GROUP_ORDER[i];
    // Skip "Units" group (it has its own flow)
    if (candidateGroup === "Units") continue;
    const hasEnabled = allEnabledSections.some(
      (ps) => ps.section.group_name === candidateGroup
    );
    if (hasEnabled) {
      nextGroupSlug = INSPECTION_GROUP_SLUGS[candidateGroup];
      nextGroupName = candidateGroup;
      break;
    }
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-content-quaternary mb-4">
        <Link
          href="/inspections"
          className="hover:text-brand-600 transition-colors"
        >
          {t("nav.inspections")}
        </Link>
        <span>/</span>
        <Link
          href={`/inspections/${projectId}?group=${groupSlug}`}
          className="hover:text-brand-600 transition-colors"
        >
          {project.name}
        </Link>
        <span>/</span>
        <span className="text-content-primary">{INSPECTION_GROUP_KEYS[groupName] ? t(`inspection.sectionGroups.${INSPECTION_GROUP_KEYS[groupName]}`) : groupName}</span>
      </div>

      {/* Group header */}
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/inspections/${projectId}?group=${groupSlug}`}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 rounded-lg transition-colors"
            title={t("dashboard.backToProject")}
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0h4"
              />
            </svg>
            {t("common.project")}
          </Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold text-content-primary">{INSPECTION_GROUP_KEYS[groupName] ? t(`inspection.sectionGroups.${INSPECTION_GROUP_KEYS[groupName]}`) : groupName}</h1>
              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gold-100 text-gold-800">
                {t(`inspection.inspectionTypes.${project.inspection_type === "bank_ready" ? "bankReady" : "internal"}`)}
              </span>
            </div>
            <p className="text-sm text-content-quaternary mt-0.5">
              {t("dashboard.subSections", { count: groupSections.length })} · {t("inspection.tapToInspect")}
            </p>
          </div>
        </div>
      </div>

      {/* Group checklist with inline findings */}
      <InspectionGroupChecklist
        sections={sectionsData}
        projectId={projectId}
        inspectionType={project.inspection_type}
      />

      {/* Next group navigation */}
      {nextGroupSlug && nextGroupName && (
        <div className="mt-6 flex justify-end">
          <Link
            href={`/inspections/${projectId}/groups/${nextGroupSlug}`}
            className="px-4 py-2 bg-brand-600 text-white text-sm rounded-md hover:bg-brand-700 transition-colors"
          >
            {t("dashboard.nextLabel", { name: INSPECTION_GROUP_KEYS[nextGroupName] ? t(`inspection.sectionGroups.${INSPECTION_GROUP_KEYS[nextGroupName]}`) : nextGroupName })}
          </Link>
        </div>
      )}
    </div>
  );
}
