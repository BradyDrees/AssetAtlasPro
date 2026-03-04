"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CreateInspectionFinding, InspectionTerm } from "@/lib/inspection-types";
import type { SupabaseClient } from "@supabase/supabase-js";

// Whitelist of fields that can be updated on a finding
const ALLOWED_FIELDS = new Set([
  "title",
  "location",
  "priority",
  "exposure_bucket",
  "exposure_custom",
  "risk_flags",
  "tags",
  "notes",
]);

/**
 * Recalculate and persist the condition_rating for a project section
 * based on the average priority of its findings.
 *
 * Priority 1 (Immediate/worst) → condition 1 (Poor)
 * Priority 5 (Monitor/best)    → condition 5 (Excellent)
 * No finding / null priority   → condition 5 (Good, no issue)
 */
async function recalculateSubsectionHealth(
  supabase: SupabaseClient,
  projectSectionId: string
): Promise<void> {
  try {
    // Fetch all findings for this project section
    const { data: findings } = await supabase
      .from("inspection_findings")
      .select("priority")
      .eq("project_section_id", projectSectionId);

    if (!findings || findings.length === 0) {
      // No findings → reset to null (unrated)
      await supabase
        .from("inspection_project_sections")
        .update({ condition_rating: null })
        .eq("id", projectSectionId);
      return;
    }

    // Score each finding: priority value, or 5 if null (Good)
    const scores = findings.map((f: { priority: number | null }) =>
      f.priority ?? 5
    );
    const avg = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
    const rounded = Math.max(1, Math.min(5, Math.round(avg)));

    await supabase
      .from("inspection_project_sections")
      .update({ condition_rating: rounded })
      .eq("id", projectSectionId);
  } catch (err) {
    // Non-critical — don't fail the main operation
    console.error("Failed to recalculate subsection health:", err);
  }
}

export async function createInspectionFinding(
  data: CreateInspectionFinding
): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Get next sort_order
  const { data: maxSort } = await supabase
    .from("inspection_findings")
    .select("sort_order")
    .eq("project_section_id", data.project_section_id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();
  const nextSort = (maxSort?.sort_order ?? -1) + 1;

  const { data: finding, error } = await supabase
    .from("inspection_findings")
    .insert({
      project_id: data.project_id,
      project_section_id: data.project_section_id,
      checklist_item_id: data.checklist_item_id || null,
      unit_id: data.unit_id || null,
      title: data.title.trim(),
      sort_order: nextSort,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  // Recalculate health score for this sub-section
  await recalculateSubsectionHealth(supabase, data.project_section_id);

  revalidatePath(`/inspections/${data.project_id}`, "page");
  revalidatePath(
    `/inspections/${data.project_id}/sections/${data.project_section_id}`
  );
  // Revalidate all group pages (we don't know which group this section belongs to)
  revalidatePath(`/inspections/${data.project_id}/groups`, "layout");

  return finding.id;
}

export async function updateInspectionFindingField(
  findingId: string,
  projectId: string,
  projectSectionId: string,
  field: string,
  value: string | number | string[] | null
) {
  if (!ALLOWED_FIELDS.has(field)) {
    throw new Error(`Field "${field}" is not allowed`);
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Check permission: owner can update any, collaborator can only update own
  const { data: project } = await supabase
    .from("inspection_projects")
    .select("owner_id")
    .eq("id", projectId)
    .single();

  if (project?.owner_id !== user.id) {
    const { data: finding } = await supabase
      .from("inspection_findings")
      .select("created_by")
      .eq("id", findingId)
      .single();

    if (finding?.created_by !== user.id) {
      throw new Error("You can only edit findings you created");
    }
  }

  const { error } = await supabase
    .from("inspection_findings")
    .update({ [field]: value })
    .eq("id", findingId);

  if (error) throw new Error(error.message);

  // Recalculate health when priority changes
  if (field === "priority") {
    await recalculateSubsectionHealth(supabase, projectSectionId);
  }

  revalidatePath(
    `/inspections/${projectId}/sections/${projectSectionId}`
  );
  revalidatePath(`/inspections/${projectId}`, "page");
  revalidatePath(`/inspections/${projectId}/groups`, "layout");
}

export async function deleteInspectionFinding(
  findingId: string,
  projectId: string,
  projectSectionId: string
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Check permission: owner can delete any, collaborator can only delete own
  const { data: project } = await supabase
    .from("inspection_projects")
    .select("owner_id")
    .eq("id", projectId)
    .single();

  if (project?.owner_id !== user.id) {
    // Not owner — check if this finding belongs to the current user
    const { data: finding } = await supabase
      .from("inspection_findings")
      .select("created_by")
      .eq("id", findingId)
      .single();

    if (finding?.created_by !== user.id) {
      throw new Error("You can only delete findings you created");
    }
  }

  // First, delete storage files for all captures belonging to this finding
  const { data: captures } = await supabase
    .from("inspection_captures")
    .select("image_path")
    .eq("finding_id", findingId);

  if (captures && captures.length > 0) {
    const paths = captures.map((c: { image_path: string }) => c.image_path);
    await supabase.storage.from("dd-captures").remove(paths);
  }

  // Delete the finding (CASCADE will remove captures rows)
  const { error } = await supabase
    .from("inspection_findings")
    .delete()
    .eq("id", findingId);

  if (error) throw new Error(error.message);

  // Recalculate health after deletion
  await recalculateSubsectionHealth(supabase, projectSectionId);

  revalidatePath(`/inspections/${projectId}`, "page");
  revalidatePath(
    `/inspections/${projectId}/sections/${projectSectionId}`
  );
  revalidatePath(`/inspections/${projectId}/groups`, "layout");
}

// ============================================
// Operate Capture — Learning Autocomplete
// ============================================

/**
 * Atomic upsert: insert term or increment use_count via RPC.
 */
export async function upsertInspectionTerm(
  termType: "category" | "location" | "tag",
  termValue: string
): Promise<InspectionTerm | null> {
  const supabase = await createClient();

  const cleaned = termValue.trim();
  if (!cleaned) return null;

  const { data, error } = await supabase.rpc("increment_term_use_count", {
    p_term_type: termType,
    p_term_value: cleaned,
  });

  if (error) throw error;
  return (data as InspectionTerm) ?? null;
}

/**
 * Fetch user's learned terms, sorted by use_count DESC.
 * Optional prefix query for type-ahead filtering.
 */
export async function getInspectionTerms(
  termType: "category" | "location" | "tag",
  query?: string
): Promise<InspectionTerm[]> {
  const supabase = await createClient();

  let q = supabase
    .from("inspection_terms")
    .select("id, user_id, term_type, term_value, use_count, last_used_at, created_at")
    .eq("term_type", termType)
    .order("use_count", { ascending: false })
    .limit(50);

  if (query && query.trim()) {
    q = q.ilike("term_value", `${query.trim()}%`);
  }

  const { data, error } = await q;
  if (error) throw error;
  return (data as InspectionTerm[]) ?? [];
}

/**
 * Create a finding + capture in one call (camera-first flow).
 * Also learns the category, location, and tag terms.
 */
export async function createQuickFinding(params: {
  projectId: string;
  projectSectionId: string;
  storagePath: string;
  category: string;
  location: string;
  priority: number | null;
  riskFlags: string[];
  tags: string[];
  notes?: string;
  unitId?: string | null;
}): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // 1) Get next sort_order
  const { data: maxSort } = await supabase
    .from("inspection_findings")
    .select("sort_order")
    .eq("project_section_id", params.projectSectionId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();
  const nextSort = (maxSort?.sort_order ?? -1) + 1;

  // 2) Insert finding
  const { data: finding, error: findingErr } = await supabase
    .from("inspection_findings")
    .insert({
      project_id: params.projectId,
      project_section_id: params.projectSectionId,
      checklist_item_id: null,
      unit_id: params.unitId ?? null,
      title: params.category, // Use category as the finding title
      location: params.location,
      priority: params.priority,
      risk_flags: params.riskFlags ?? [],
      tags: params.tags ?? [],
      notes: params.notes ?? "",
      sort_order: nextSort,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (findingErr) throw new Error(findingErr.message);

  // 3) Attach capture to finding
  const { data: maxCapSort } = await supabase
    .from("inspection_captures")
    .select("sort_order")
    .eq("project_section_id", params.projectSectionId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();
  const nextCapSort = (maxCapSort?.sort_order ?? -1) + 1;

  const { error: capErr } = await supabase.from("inspection_captures").insert({
    project_section_id: params.projectSectionId,
    finding_id: finding.id,
    unit_id: params.unitId ?? null,
    file_type: "image",
    image_path: params.storagePath,
    caption: "",
    sort_order: nextCapSort,
    created_by: user.id,
  });

  if (capErr) throw new Error(capErr.message);

  // 4) Learn terms (non-blocking)
  const termPromises: Promise<unknown>[] = [];
  if (params.category.trim()) {
    termPromises.push(upsertInspectionTerm("category", params.category));
  }
  if (params.location.trim()) {
    termPromises.push(upsertInspectionTerm("location", params.location));
  }
  for (const tag of params.tags ?? []) {
    if (tag.trim()) {
      termPromises.push(upsertInspectionTerm("tag", tag));
    }
  }
  await Promise.allSettled(termPromises);

  // 5) Recalculate health
  await recalculateSubsectionHealth(supabase, params.projectSectionId);

  revalidatePath(`/inspections/${params.projectId}`, "page");
  revalidatePath(
    `/inspections/${params.projectId}/sections/${params.projectSectionId}`
  );
  revalidatePath(`/inspections/${params.projectId}/groups`, "layout");

  return finding.id;
}

/**
 * Add a capture to an existing finding (the "Add to last" flow).
 */
export async function addCaptureToFinding(params: {
  projectId: string;
  projectSectionId: string;
  findingId: string;
  storagePath: string;
  unitId?: string | null;
}): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: maxCapSort } = await supabase
    .from("inspection_captures")
    .select("sort_order")
    .eq("project_section_id", params.projectSectionId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .single();
  const nextCapSort = (maxCapSort?.sort_order ?? -1) + 1;

  const { error } = await supabase.from("inspection_captures").insert({
    project_section_id: params.projectSectionId,
    finding_id: params.findingId,
    unit_id: params.unitId ?? null,
    file_type: "image",
    image_path: params.storagePath,
    caption: "",
    sort_order: nextCapSort,
    created_by: user.id,
  });

  if (error) throw new Error(error.message);

  revalidatePath(
    `/inspections/${params.projectId}/sections/${params.projectSectionId}`
  );
}
