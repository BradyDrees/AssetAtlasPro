import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { InspectionHeaderMenu } from "@/components/inspection-header-menu";
import { InspectionGroupChecklist } from "@/components/inspection-group-checklist";
import { InspectionProjectTabs } from "@/components/inspection-project-tabs";
import { INSPECTION_GROUP_ORDER, INSPECTION_GROUP_SLUGS } from "@/lib/inspection-sections";
import { INSPECTION_TYPE_LABELS } from "@/lib/inspection-constants";
import type {
  InspectionProjectSectionWithDetails,
  InspectionChecklistItem,
  InspectionFinding,
  InspectionCapture,
  InspectionSectionGroup as SectionGroupType,
  ProjectRole,
} from "@/lib/inspection-types";

export const dynamic = "force-dynamic";

const statusStyles: Record<string, string> = {
  DRAFT: "bg-surface-tertiary text-content-tertiary",
  IN_PROGRESS: "bg-brand-100 text-brand-700",
  COMPLETE: "bg-green-100 text-green-700",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Draft",
  IN_PROGRESS: "In Progress",
  COMPLETE: "Complete",
};

export default async function InspectionDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ group?: string }>;
}) {
  const { id } = await params;
  const { group: scrollToGroup } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch project
  const { data: project } = await supabase
    .from("inspection_projects")
    .select("*")
    .eq("id", id)
    .single();

  if (!project) notFound();

  // Determine role
  const currentUserId = user?.id ?? "";
  const role: ProjectRole = project.owner_id === currentUserId ? "owner" : "collaborator";

  // Fetch ALL enabled project sections joined with master section data
  const { data: projectSections } = await supabase
    .from("inspection_project_sections")
    .select(
      `
      *,
      section:inspection_sections(*)
    `
    )
    .eq("project_id", id)
    .eq("enabled", true)
    .order("sort_order");

  const allSections = (projectSections ?? []) as InspectionProjectSectionWithDetails[];

  // Batch fetch: ALL checklist items for all enabled sections
  const masterSectionIds = [...new Set(allSections.map((ps) => ps.section_id))];
  let allChecklistItems: InspectionChecklistItem[] = [];
  if (masterSectionIds.length > 0) {
    const { data } = await supabase
      .from("inspection_checklist_items")
      .select("*")
      .in("section_id", masterSectionIds)
      .order("sort_order");
    allChecklistItems = (data ?? []) as InspectionChecklistItem[];
  }

  // Batch fetch: ALL findings for all enabled sections
  const projectSectionIds = allSections.map((ps) => ps.id);
  let allFindings: InspectionFinding[] = [];
  if (projectSectionIds.length > 0) {
    const { data } = await supabase
      .from("inspection_findings")
      .select("*")
      .in("project_section_id", projectSectionIds)
      .order("sort_order");
    allFindings = (data ?? []) as InspectionFinding[];
  }

  // Batch fetch: ALL captures for all enabled sections
  let allCaptures: InspectionCapture[] = [];
  if (projectSectionIds.length > 0) {
    const { data } = await supabase
      .from("inspection_captures")
      .select("*")
      .in("project_section_id", projectSectionIds)
      .order("sort_order");
    allCaptures = (data ?? []) as InspectionCapture[];
  }

  // Group sections by group_name, maintaining order
  // For each group, build the sectionsData array that InspectionGroupChecklist expects
  const groups = INSPECTION_GROUP_ORDER
    .map((groupName) => {
      const groupSections = allSections.filter(
        (ps) => ps.section.group_name === groupName
      );
      if (groupSections.length === 0) return null;

      const isUnitMode = groupSections.some((ps) => ps.section.is_unit_mode);

      const sectionsData = groupSections.map((ps) => ({
        projectSection: ps,
        checklistItems: allChecklistItems.filter(
          (ci) => ci.section_id === ps.section_id
        ),
        findings: allFindings.filter(
          (f) => f.project_section_id === ps.id
        ),
        captures: allCaptures.filter(
          (c) => c.project_section_id === ps.id
        ),
      }));

      // Count findings for this group
      const findingCount = sectionsData.reduce(
        (sum, s) => sum + s.findings.length,
        0
      );

      return {
        groupName,
        groupSlug: INSPECTION_GROUP_SLUGS[groupName] ?? "unknown",
        isUnitMode,
        sectionsData,
        findingCount,
        sectionCount: groupSections.length,
      };
    })
    .filter(Boolean) as {
      groupName: string;
      groupSlug: string;
      isUnitMode: boolean;
      sectionsData: {
        projectSection: InspectionProjectSectionWithDetails;
        checklistItems: InspectionChecklistItem[];
        findings: InspectionFinding[];
        captures: InspectionCapture[];
      }[];
      findingCount: number;
      sectionCount: number;
    }[];

  return (
    <div>
      {/* Project header — gradient banner */}
      <div className="bg-[radial-gradient(ellipse_at_top_left,_var(--brand-900)_0%,_transparent_50%),radial-gradient(ellipse_at_bottom_right,_var(--brand-900)_0%,_var(--charcoal-950)_60%)] bg-charcoal-900 -mx-4 -mt-4 md:-mx-6 md:-mt-6 px-4 py-5 md:px-6 rounded-b-xl mb-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-brand-300 mb-3">
          <Link
            href="/inspections"
            className="hover:text-white transition-colors"
          >
            Inspections
          </Link>
          <span className="text-brand-500">/</span>
          <span className="text-white font-medium">{project.name}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/inspections"
              className="p-1.5 text-charcoal-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
              title="Back to all inspections"
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
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">
                  {project.name}
                </h1>
                <span
                  className={`text-xs px-2 py-0.5 rounded-full font-medium bg-white/20 text-white`}
                >
                  {statusLabels[project.status]}
                </span>
                <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-gold-500/30 text-gold-200">
                  {INSPECTION_TYPE_LABELS[project.inspection_type]}
                </span>
              </div>
              <p className="text-brand-200 mt-1">{project.property_name}</p>
              {project.address && (
                <p className="text-sm text-brand-300/70 mt-0.5">{project.address}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href={`/inspections/${id}/review`}
              className="px-4 py-2 bg-white/20 backdrop-blur-sm text-white text-sm font-medium rounded-lg hover:bg-white/30 border border-white/30 transition-all"
            >
              Review &amp; Export
            </Link>
            <InspectionHeaderMenu project={project} role={role} />
          </div>
        </div>
      </div>

      {/* Group tabs + inline checklists */}
      <InspectionProjectTabs
        groups={groups}
        projectId={id}
        inspectionType={project.inspection_type}
        role={role}
        currentUserId={currentUserId}
        scrollToGroup={scrollToGroup}
      />
    </div>
  );
}
