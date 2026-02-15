import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { UnitGradeSelector } from "@/components/unit-grade-selector";
import { UnitBdBaSelect } from "@/components/unit-bd-ba-select";
import { UnitAppliancesSelect } from "@/components/unit-appliances-select";
import { UnitCabinetSelect } from "@/components/unit-cabinet-select";
import { UnitToggleField } from "@/components/unit-toggle-field";
import { UnitNotes } from "@/components/unit-notes";
import { CaptureButton } from "@/components/capture-button";
import { CaptureGallery } from "@/components/capture-gallery";
import { NextUnitButton } from "@/components/next-unit-button";
import { NextSectionButton } from "@/components/next-section-button";
import type { DDCapture } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function UnitDetailPage({
  params,
}: {
  params: Promise<{ id: string; sectionId: string; unitId: string }>;
}) {
  const { id: projectId, sectionId: projectSectionId, unitId } = await params;
  const supabase = await createClient();

  // Fetch project
  const { data: project } = await supabase
    .from("dd_projects")
    .select("id, name, property_name")
    .eq("id", projectId)
    .single();

  if (!project) notFound();

  // Fetch project section with master section data
  const { data: projectSection } = await supabase
    .from("dd_project_sections")
    .select(`*, section:dd_sections(*)`)
    .eq("id", projectSectionId)
    .eq("project_id", projectId)
    .single();

  if (!projectSection) notFound();

  // Fetch unit
  const { data: unit } = await supabase
    .from("dd_units")
    .select("*")
    .eq("id", unitId)
    .eq("project_section_id", projectSectionId)
    .single();

  if (!unit) notFound();

  // Fetch captures for this unit
  const { data: captures } = await supabase
    .from("dd_captures")
    .select("*")
    .eq("project_section_id", projectSectionId)
    .eq("unit_id", unitId)
    .order("sort_order", { ascending: true });

  // Fetch all enabled sections for "Next Section" button
  const { data: allEnabledSections } = await supabase
    .from("dd_project_sections")
    .select("id, sort_order, section:dd_sections(name)")
    .eq("project_id", projectId)
    .eq("enabled", true)
    .order("sort_order", { ascending: true });

  const currentIndex = (allEnabledSections ?? []).findIndex(
    (s: any) => s.id === projectSectionId
  );
  const nextSection =
    currentIndex >= 0 &&
    currentIndex < (allEnabledSections ?? []).length - 1
      ? (allEnabledSections ?? [])[currentIndex + 1]
      : null;

  const storageBaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;

  return (
    <div className="pb-24">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4 flex-wrap">
        <Link href="/dashboard" className="hover:text-brand-600 transition-colors">
          Projects
        </Link>
        <span>/</span>
        <Link href={`/projects/${projectId}`} className="hover:text-brand-600 transition-colors">
          {project.name}
        </Link>
        <span>/</span>
        <Link
          href={`/projects/${projectId}/sections/${projectSectionId}`}
          className="hover:text-brand-600 transition-colors"
        >
          {projectSection.section.name}
        </Link>
        <span>/</span>
        <span className="text-gray-900">
          B{unit.building} — {unit.unit_number}
        </span>
      </div>

      {/* Back button + Unit header */}
      <div className="mb-6">
        <Link
          href={`/projects/${projectId}/sections/${projectSectionId}`}
          className="inline-flex items-center gap-1.5 text-sm text-brand-600 font-medium mb-2 hover:text-brand-800 transition-colors"
        >
          <span>&larr;</span> Back to {projectSection.section.name}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">
          Building {unit.building} / Unit {unit.unit_number}
        </h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {projectSection.section.name}
        </p>
      </div>

      {/* ===== Inspection Fields ===== */}
      <div className="space-y-4">
        {/* BD/BA */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <UnitBdBaSelect
            unitId={unitId}
            projectId={projectId}
            projectSectionId={projectSectionId}
            initialValue={unit.bd_ba}
          />
        </div>

        {/* Appliances */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <UnitAppliancesSelect
            unitId={unitId}
            projectId={projectId}
            projectSectionId={projectSectionId}
            initialValue={unit.appliances ?? []}
          />
        </div>

        {/* Tenant Grade */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <UnitGradeSelector
            unitId={unitId}
            projectId={projectId}
            projectSectionId={projectSectionId}
            type="tenant"
            field="tenant_grade"
            label="Tenant Grade"
            initialValue={unit.tenant_grade}
          />
        </div>

        {/* Unit Grade */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <UnitGradeSelector
            unitId={unitId}
            projectId={projectId}
            projectSectionId={projectSectionId}
            type="unit"
            field="unit_grade"
            label="Unit Grade"
            initialValue={unit.unit_grade}
          />
        </div>

        {/* Cabinets */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <UnitCabinetSelect
            unitId={unitId}
            projectId={projectId}
            projectSectionId={projectSectionId}
            field="cabinets"
            label="Cabinets"
            initialValue={unit.cabinets}
          />
        </div>

        {/* Countertop */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <UnitCabinetSelect
            unitId={unitId}
            projectId={projectId}
            projectSectionId={projectSectionId}
            field="countertop"
            label="Countertop"
            initialValue={unit.countertop}
          />
        </div>

        {/* Flooring */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <UnitCabinetSelect
            unitId={unitId}
            projectId={projectId}
            projectSectionId={projectSectionId}
            field="flooring"
            label="Flooring"
            initialValue={unit.flooring}
          />
        </div>

        {/* Mold */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <UnitToggleField
            unitId={unitId}
            projectId={projectId}
            projectSectionId={projectSectionId}
            field="has_mold"
            label="Mold"
            initialValue={unit.has_mold}
          />
        </div>

        {/* Washer/Dryer Connection */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <UnitToggleField
            unitId={unitId}
            projectId={projectId}
            projectSectionId={projectSectionId}
            field="has_wd_connect"
            label="Washer/Dryer Connection"
            initialValue={unit.has_wd_connect}
            yesIsGood={true}
          />
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <UnitNotes
            unitId={unitId}
            projectId={projectId}
            projectSectionId={projectSectionId}
            initialNotes={unit.notes ?? ""}
          />
        </div>

        {/* Photos & Media */}
        <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3 pt-2">
          Photos & Media
        </h2>
        <CaptureGallery
          captures={(captures as DDCapture[]) ?? []}
          projectId={projectId}
          projectSectionId={projectSectionId}
          storageBaseUrl={storageBaseUrl}
        />
      </div>

      {/* Floating buttons */}
      {nextSection && (
        <NextSectionButton
          projectId={projectId}
          nextSectionId={nextSection.id}
          nextSectionName={(nextSection as any).section.name}
        />
      )}
      <NextUnitButton
        projectId={projectId}
        projectSectionId={projectSectionId}
        currentBuilding={unit.building}
      />
      <CaptureButton
        projectSectionId={projectSectionId}
        projectId={projectId}
        sectionSlug={projectSection.section.slug}
        unitId={unitId}
      />
    </div>
  );
}
