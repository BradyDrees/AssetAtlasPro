import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { DD_GROUP_SLUGS } from "@/lib/dd-sections";
import { ItemRating } from "@/components/item-rating";
import { ItemNotes } from "@/components/item-notes";
import { CaptureButton } from "@/components/capture-button";
import { CaptureGallery } from "@/components/capture-gallery";
import { NextSectionButton } from "@/components/next-section-button";
import { AddSectionItemForm } from "@/components/add-section-item-form";
import type { DDCapture } from "@/lib/types";
import { NextItemButton } from "@/components/next-item-button";

export const dynamic = "force-dynamic";

export default async function ItemDetailPage({
  params,
}: {
  params: Promise<{ id: string; sectionId: string; itemId: string }>;
}) {
  const {
    id: projectId,
    sectionId: projectSectionId,
    itemId,
  } = await params;
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

  const groupSlug = DD_GROUP_SLUGS[projectSection.section.group_name] ?? "";

  // Fetch section item
  const { data: item } = await supabase
    .from("dd_section_items")
    .select("*")
    .eq("id", itemId)
    .eq("project_section_id", projectSectionId)
    .single();

  if (!item) notFound();

  // Fetch captures for this item
  const { data: captures } = await supabase
    .from("dd_captures")
    .select("*")
    .eq("project_section_id", projectSectionId)
    .eq("section_item_id", itemId)
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
    <div className="pb-36">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-500 mb-4 flex-wrap">
        <Link
          href="/dashboard"
          className="hover:text-brand-600 transition-colors"
        >
          Projects
        </Link>
        <span>/</span>
        <Link
          href={`/projects/${projectId}?group=${groupSlug}`}
          className="hover:text-brand-600 transition-colors"
        >
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
        <span className="text-gray-900">{item.name}</span>
      </div>

      {/* Back button + Item header */}
      <div className="mb-6">
        <Link
          href={`/projects/${projectId}/sections/${projectSectionId}`}
          className="inline-flex items-center gap-1.5 text-sm text-brand-600 font-medium mb-2 hover:text-brand-800 transition-colors"
        >
          <span>&larr;</span> Back to {projectSection.section.name}
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">{item.name}</h1>
        <p className="text-sm text-gray-400 mt-0.5">
          {projectSection.section.name}
        </p>
      </div>

      {/* Inspection fields */}
      <div className="space-y-4">
        {/* Condition rating */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <ItemRating
            itemId={itemId}
            projectId={projectId}
            projectSectionId={projectSectionId}
            initialRating={item.condition_rating}
          />
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <ItemNotes
            itemId={itemId}
            projectId={projectId}
            projectSectionId={projectSectionId}
            initialNotes={item.notes ?? ""}
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
      <NextItemButton
        projectId={projectId}
        projectSectionId={projectSectionId}
      />
      <CaptureButton
        projectSectionId={projectSectionId}
        projectId={projectId}
        sectionSlug={projectSection.section.slug}
        sectionItemId={itemId}
      />
    </div>
  );
}
