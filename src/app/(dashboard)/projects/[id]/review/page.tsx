import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { ProjectStatusControls } from "@/components/project-status-controls";
import { ExportButtons } from "@/components/export-buttons";
import type { ProjectStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const statusStyles: Record<string, string> = {
  DRAFT: "bg-surface-tertiary text-content-tertiary",
  IN_PROGRESS: "bg-brand-100 text-brand-700",
  COMPLETE: "bg-green-100 text-green-700",
};

export default async function ReviewPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: projectId } = await params;
  const t = await getTranslations("review");
  const supabase = await createClient();

  // Fetch project
  const { data: project } = await supabase
    .from("dd_projects")
    .select("*")
    .eq("id", projectId)
    .single();

  if (!project) notFound();

  // Fetch all project sections with master data
  const { data: projectSections } = await supabase
    .from("dd_project_sections")
    .select(`*, section:dd_sections(*)`)
    .eq("project_id", projectId)
    .order("sort_order");

  const enabledSections = (projectSections ?? []).filter(
    (ps: any) => ps.enabled
  );
  const unitModeSections = enabledSections.filter(
    (ps: any) => ps.section.is_unit_mode
  );
  const nonUnitSections = enabledSections.filter(
    (ps: any) => !ps.section.is_unit_mode
  );

  // Fetch ALL units for this project
  const unitSectionIds = unitModeSections.map((ps: any) => ps.id);
  let allUnits: any[] = [];
  if (unitSectionIds.length > 0) {
    const { data: units } = await supabase
      .from("dd_units")
      .select("id, project_section_id, building, unit_number, bd_ba, tenant_grade, unit_grade")
      .in("project_section_id", unitSectionIds);
    allUnits = units ?? [];
  }

  // Fetch ALL section items for non-unit sections
  const nonUnitSectionIds = nonUnitSections.map((ps: any) => ps.id);
  let allItems: any[] = [];
  if (nonUnitSectionIds.length > 0) {
    const { data: items } = await supabase
      .from("dd_section_items")
      .select("id, project_section_id")
      .in("project_section_id", nonUnitSectionIds);
    allItems = items ?? [];
  }

  // Fetch ALL captures for this project
  const allSectionIds = (projectSections ?? []).map((ps: any) => ps.id);
  let allCaptures: any[] = [];
  if (allSectionIds.length > 0) {
    const { data: captures } = await supabase
      .from("dd_captures")
      .select("id, project_section_id, unit_id, section_item_id")
      .in("project_section_id", allSectionIds);
    allCaptures = captures ?? [];
  }

  // ===== COMPUTE METRICS =====

  // Section activity: non-unit has activity if ≥1 item, unit has activity if ≥1 unit
  const itemCountsBySection: Record<string, number> = {};
  allItems.forEach((item: any) => {
    itemCountsBySection[item.project_section_id] =
      (itemCountsBySection[item.project_section_id] ?? 0) + 1;
  });

  const unitCountsBySection: Record<string, number> = {};
  allUnits.forEach((unit: any) => {
    unitCountsBySection[unit.project_section_id] =
      (unitCountsBySection[unit.project_section_id] ?? 0) + 1;
  });

  const sectionsWithActivity = enabledSections.filter((ps: any) => {
    if (ps.section.is_unit_mode) {
      return (unitCountsBySection[ps.id] ?? 0) > 0;
    }
    return (itemCountsBySection[ps.id] ?? 0) > 0;
  });

  const sectionsUntouched = enabledSections.filter((ps: any) => {
    if (ps.section.is_unit_mode) {
      return (unitCountsBySection[ps.id] ?? 0) === 0;
    }
    return (itemCountsBySection[ps.id] ?? 0) === 0;
  });

  // Unit metrics
  const unitIdsWithPhotos = new Set(
    allCaptures
      .filter((c: any) => c.unit_id)
      .map((c: any) => c.unit_id)
  );
  const unitsWithPhotos = allUnits.filter((u: any) =>
    unitIdsWithPhotos.has(u.id)
  );
  const unitsMissingGrades = allUnits.filter(
    (u: any) => !u.unit_grade && !u.tenant_grade
  );
  const unitsMissingBdBa = allUnits.filter((u: any) => !u.bd_ba);

  // Capture metrics
  const unitLevelCaptures = allCaptures.filter((c: any) => c.unit_id);
  const itemLevelCaptures = allCaptures.filter((c: any) => c.section_item_id);
  const sectionLevelCaptures = allCaptures.filter(
    (c: any) => !c.unit_id && !c.section_item_id
  );

  // ===== BUILD WARNINGS =====
  const warnings: { label: string; href: string }[] = [];

  // Untouched sections
  sectionsUntouched.forEach((ps: any) => {
    warnings.push({
      label: t("noActivity", { name: ps.section.name }),
      href: `/projects/${projectId}/sections/${ps.id}`,
    });
  });

  // Units missing grades
  unitsMissingGrades.forEach((u: any) => {
    warnings.push({
      label: t("missingGradesLabel", { building: u.building, unit: u.unit_number }),
      href: `/projects/${projectId}/sections/${u.project_section_id}/units/${u.id}`,
    });
  });

  // Units missing BD/BA
  unitsMissingBdBa.forEach((u: any) => {
    // Avoid duplicate if already in missing grades
    if (u.unit_grade || u.tenant_grade) {
      warnings.push({
        label: t("missingBdBaLabel", { building: u.building, unit: u.unit_number }),
        href: `/projects/${projectId}/sections/${u.project_section_id}/units/${u.id}`,
      });
    }
  });

  const cookieStore = await cookies();
  const dateLocale = cookieStore.get("locale")?.value === "es" ? "es" : "en-US";
  const formattedDate = new Date(project.updated_at).toLocaleDateString(
    dateLocale,
    { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" }
  );

  return (
    <div className="pb-12">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-content-quaternary mb-4 flex-wrap">
        <Link href="/dashboard" className="hover:text-brand-600 transition-colors">
          {t("sections")}
        </Link>
        <span>/</span>
        <Link
          href={`/projects/${projectId}`}
          className="hover:text-brand-600 transition-colors"
        >
          {project.name}
        </Link>
        <span>/</span>
        <span className="text-content-primary">{t("reviewTitle")}</span>
      </div>

      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-2xl font-bold text-content-primary">{project.name}</h1>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium ${
              statusStyles[project.status]
            }`}
          >
            {t(`statusLabels.${project.status}`)}
          </span>
        </div>
        <p className="text-content-tertiary">{project.property_name}</p>
        {project.address && (
          <p className="text-sm text-content-muted mt-0.5">{project.address}</p>
        )}
        <p className="text-xs text-content-muted mt-1">{t("lastUpdated", { date: formattedDate })}</p>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
        {/* Sections card */}
        <div className="bg-surface-primary rounded-lg border border-edge-primary p-4">
          <h3 className="text-xs font-semibold text-content-quaternary uppercase tracking-wide mb-2">
            {t("sections")}
          </h3>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-content-tertiary">{t("enabled")}</span>
              <span className="font-medium">{enabledSections.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-content-tertiary">{t("withActivity")}</span>
              <span className="font-medium text-green-600">
                {sectionsWithActivity.length}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-content-tertiary">{t("untouched")}</span>
              <span
                className={`font-medium ${
                  sectionsUntouched.length > 0 ? "text-orange-600" : "text-green-600"
                }`}
              >
                {sectionsUntouched.length}
              </span>
            </div>
          </div>
        </div>

        {/* Units card */}
        <div className="bg-surface-primary rounded-lg border border-edge-primary p-4">
          <h3 className="text-xs font-semibold text-content-quaternary uppercase tracking-wide mb-2">
            {t("units")}
          </h3>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-content-tertiary">{t("total")}</span>
              <span className="font-medium">{allUnits.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-content-tertiary">{t("withPhotos")}</span>
              <span className="font-medium">{unitsWithPhotos.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-content-tertiary">{t("missingGrades")}</span>
              <span
                className={`font-medium ${
                  unitsMissingGrades.length > 0 ? "text-orange-600" : "text-green-600"
                }`}
              >
                {unitsMissingGrades.length}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-content-tertiary">{t("missingBdBa")}</span>
              <span
                className={`font-medium ${
                  unitsMissingBdBa.length > 0 ? "text-orange-600" : "text-green-600"
                }`}
              >
                {unitsMissingBdBa.length}
              </span>
            </div>
          </div>
        </div>

        {/* Captures card */}
        <div className="bg-surface-primary rounded-lg border border-edge-primary p-4">
          <h3 className="text-xs font-semibold text-content-quaternary uppercase tracking-wide mb-2">
            {t("captures")}
          </h3>
          <div className="space-y-1">
            <div className="flex justify-between text-sm">
              <span className="text-content-tertiary">{t("total")}</span>
              <span className="font-medium">{allCaptures.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-content-tertiary">{t("unitPhotos")}</span>
              <span className="font-medium">{unitLevelCaptures.length}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-content-tertiary">{t("itemPhotos")}</span>
              <span className="font-medium">{itemLevelCaptures.length}</span>
            </div>
            {sectionLevelCaptures.length > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-content-tertiary">{t("sectionLevel")}</span>
                <span className="font-medium">{sectionLevelCaptures.length}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Needs Attention */}
      {warnings.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-content-quaternary uppercase tracking-wide mb-3">
            {t("needsAttention", { count: warnings.length })}
          </h2>
          <div className="bg-surface-primary rounded-lg border border-edge-primary divide-y divide-edge-tertiary">
            {/* Jump to first missing item */}
            <Link
              href={warnings[0].href}
              className="block px-4 py-3 bg-orange-50 hover:bg-orange-100 transition-colors rounded-t-lg"
            >
              <span className="text-sm font-semibold text-orange-700">
                {t("jumpToFirst")} &rarr;
              </span>
            </Link>
            {warnings.map((w, i) => (
              <Link
                key={i}
                href={w.href}
                className="flex items-center gap-2 px-4 py-2.5 hover:bg-surface-secondary transition-colors"
              >
                <span className="text-orange-500 text-sm">⚠</span>
                <span className="text-sm text-content-secondary">{w.label}</span>
                <span className="ml-auto text-content-muted text-xs">&rarr;</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* All good message */}
      {warnings.length === 0 && enabledSections.length > 0 && (
        <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-700 font-medium">
            {t("allComplete")}
          </p>
        </div>
      )}

      {/* Export */}
      <div className="mb-6">
        <ExportButtons projectId={projectId} projectCode={project.name} />
      </div>

      {/* Status Controls */}
      <div className="flex items-center gap-4">
        <ProjectStatusControls
          projectId={projectId}
          currentStatus={project.status as ProjectStatus}
          warnings={warnings}
        />
        <Link
          href={`/projects/${projectId}`}
          className="px-5 py-2.5 text-sm text-content-tertiary hover:text-content-primary transition-colors"
        >
          {t("backToProject")}
        </Link>
      </div>
    </div>
  );
}
