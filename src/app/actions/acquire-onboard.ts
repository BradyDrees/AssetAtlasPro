"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import {
  onboardFromDdProject,
  type OnboardingParams,
} from "@/lib/services/property-onboarding-service";

/**
 * Get project data for the onboard modal.
 * Returns project info + findings with priority/trade/exposure.
 */
export async function getProjectForOnboarding(projectId: string) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch project
  const { data: project, error: projErr } = await supabase
    .from("dd_projects")
    .select("id, name, property_name, address, status")
    .eq("id", projectId)
    .single();

  if (projErr || !project) {
    return { data: null, error: "Project not found" };
  }

  // Check if already onboarded
  const { data: existingProp } = await supabase
    .from("homeowner_properties")
    .select("id")
    .eq("source_dd_project_id", projectId)
    .maybeSingle();

  if (existingProp) {
    return { data: null, error: "already_onboarded", propertyId: existingProp.id };
  }

  // Fetch section items that could be findings (items with notes or captures)
  const { data: sections } = await supabase
    .from("dd_project_sections")
    .select("id, section:dd_sections(name)")
    .eq("project_id", projectId)
    .eq("enabled", true);

  const sectionIds = (sections ?? []).map((s) => s.id);

  let findings: Array<{
    id: string;
    sectionName: string;
    description: string;
    priority: number;
    trade: string;
    estimatedExposure: number;
  }> = [];

  if (sectionIds.length > 0) {
    const { data: items } = await supabase
      .from("dd_section_items")
      .select("id, project_section_id, label, notes, condition, priority")
      .in("project_section_id", sectionIds)
      .not("notes", "is", null);

    if (items && items.length > 0) {
      const sectionMap = new Map(
        (sections ?? []).map((s) => [s.id, (s as any).section?.name ?? "General"])
      );

      findings = items.map((item) => ({
        id: item.id,
        sectionName: sectionMap.get(item.project_section_id) ?? "General",
        description: item.notes ?? item.label ?? "Finding",
        priority: item.priority ?? 3,
        trade: mapSectionToTrade(sectionMap.get(item.project_section_id) ?? ""),
        estimatedExposure: 0,
      }));
    }
  }

  return {
    data: {
      project,
      findings,
      pmUserId: user.id,
    },
  };
}

/**
 * Execute the onboarding process.
 */
export async function executeOnboarding(input: {
  projectId: string;
  selectedFindingIds: string[];
  propertyAddress: string;
  city?: string;
  state?: string;
  zip?: string;
  homeownerId?: string;
}): Promise<{
  success: boolean;
  propertyId?: string;
  woCount?: number;
  error?: string;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "Not authenticated" };

  // Fetch findings data for selected items
  const { data: allFindings } = await supabase
    .from("dd_section_items")
    .select("id, label, notes, condition, priority, project_section_id")
    .in("id", input.selectedFindingIds);

  // Get section names
  const sectionIds = [...new Set((allFindings ?? []).map((f) => f.project_section_id))];
  const { data: sections } = await supabase
    .from("dd_project_sections")
    .select("id, section:dd_sections(name)")
    .in("id", sectionIds);

  const sectionMap = new Map(
    (sections ?? []).map((s) => [s.id, (s as any).section?.name ?? "General"])
  );

  const params: OnboardingParams = {
    ddProjectId: input.projectId,
    propertyData: {
      address: input.propertyAddress,
      city: input.city,
      state: input.state,
      zip: input.zip,
    },
    findings: (allFindings ?? []).map((f) => ({
      id: f.id,
      finding: {
        title: f.notes ?? f.label ?? "Finding",
        description: f.notes ?? "",
        priority: f.priority ?? 3,
        trade: mapSectionToTrade(sectionMap.get(f.project_section_id) ?? ""),
        estimatedExposure: 0,
        photoUrls: [],
        sectionName: sectionMap.get(f.project_section_id) ?? "General",
        condition: f.condition,
      },
      selected: true,
    })),
    pmUserId: user.id,
    homeownerId: input.homeownerId,
  };

  const result = await onboardFromDdProject(params);

  return {
    success: result.success,
    propertyId: result.propertyId,
    woCount: result.woIds?.length ?? 0,
    error: result.error,
  };
}

/**
 * Map DD section name to a trade category.
 */
function mapSectionToTrade(sectionName: string): string {
  const name = sectionName.toLowerCase();
  if (name.includes("mechanical") || name.includes("hvac")) return "hvac";
  if (name.includes("plumbing") || name.includes("water")) return "plumbing";
  if (name.includes("electrical")) return "electrical";
  if (name.includes("roof")) return "roofing";
  if (name.includes("exterior")) return "general";
  if (name.includes("interior") || name.includes("unit")) return "general";
  if (name.includes("amenity") || name.includes("common")) return "general";
  return "general";
}
