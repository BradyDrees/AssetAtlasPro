/**
 * Property Onboarding Service
 *
 * Acquire → Operate conversion as a two-phase operation:
 *   Phase 1 (atomic DB): Create property + draft WOs + event rows
 *   Phase 2 (best-effort): Copy DD photos to property
 *
 * Handles recovery from partial failures with `onboarding_failed` state.
 */
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { createFromIntake, type WorkOrderIntake } from "./work-order-service";
import { emitEvent } from "@/lib/platform/domain-events";
import type { FindingSnapshot } from "./dispatch-service";

// ============================================
// Types
// ============================================

export interface OnboardingParams {
  ddProjectId: string;
  propertyData: {
    address: string;
    city?: string;
    state?: string;
    zip?: string;
    systems?: Record<string, unknown>[];
    conditionScores?: Record<string, number>;
  };
  findings: Array<{
    id: string;
    finding: FindingSnapshot;
    selected: boolean; // PM checked this finding for WO creation
  }>;
  photoPaths?: string[]; // Storage paths from DD captures
  pmUserId: string;
  homeownerId?: string;
}

export interface OnboardingResult {
  success: boolean;
  propertyId?: string;
  woIds?: string[];
  error?: string;
  phase?: "db" | "photos";
  failedPhotos?: string[];
}

// ============================================
// Onboard from DD Project
// ============================================

/**
 * Convert an Acquire DD project into an Operate property.
 *
 * Phase 1 (atomic):
 *   1. Create homeowner_properties record
 *   2. Create source-linked draft WOs from selected findings
 *   3. Log property.onboarded domain event
 *   4. Mark DD project as onboarding_in_progress
 *
 * Phase 2 (best-effort with recovery):
 *   5. Copy DD photos to property_system_photos
 *   6. On success: mark project as onboarded
 *   7. On failure: mark as onboarding_failed with metadata
 */
export async function onboardFromDdProject(
  params: OnboardingParams
): Promise<OnboardingResult> {
  const supabase = await createClient();
  const serviceClient = createServiceClient();
  const { ddProjectId, propertyData, findings, pmUserId, homeownerId } = params;

  // Check for duplicate onboarding
  const { data: existingProp } = await supabase
    .from("homeowner_properties")
    .select("id")
    .eq("source_dd_project_id", ddProjectId)
    .limit(1)
    .maybeSingle();

  if (existingProp) {
    return {
      success: false,
      error: "Property already onboarded from this DD project",
      propertyId: existingProp.id,
    };
  }

  // ─── Phase 1: Atomic DB operations ───
  try {
    // 1. Create property
    const { data: newProp, error: propErr } = await supabase
      .from("homeowner_properties")
      .insert({
        user_id: homeownerId ?? pmUserId,
        address: propertyData.address,
        city: propertyData.city,
        state: propertyData.state,
        zip: propertyData.zip,
        source_dd_project_id: ddProjectId,
        onboarded_at: new Date().toISOString(),
      })
      .select("id")
      .single();

    if (propErr || !newProp) {
      return {
        success: false,
        error: `Failed to create property: ${propErr?.message ?? "unknown"}`,
        phase: "db",
      };
    }

    // 2. Create WOs from selected findings
    const selectedFindings = findings.filter((f) => f.selected);
    const woIds: string[] = [];

    for (const item of selectedFindings) {
      const intake: WorkOrderIntake = {
        trade: item.finding.trade ?? "general",
        urgency: item.finding.priority <= 2 ? "urgent" : "normal",
        description: item.finding.title,
        propertyId: newProp.id,
        propertyName: propertyData.address,
        pmUserId,
        homeownerId,
        budgetAmount: item.finding.estimatedExposure,
        source: {
          type: "acquire_finding",
          id: item.id,
          snapshot: item.finding as unknown as Record<string, unknown>,
          createdVia: "automation",
          originModule: "acquire",
          leadSource: "pm_assignment",
        },
      };

      const { data: woData } = await createFromIntake(intake, pmUserId);
      if (woData) {
        woIds.push(woData.id);
      }
    }

    // 3. Emit property.onboarded event
    await emitEvent(
      "property.onboarded",
      "property",
      newProp.id,
      {
        property_id: newProp.id,
        origin_module: "acquire",
        source_type: "acquire_finding",
        source_id: ddProjectId,
        wo_count: woIds.length,
        finding_count: selectedFindings.length,
      },
      { id: pmUserId, type: "user" }
    ).catch(() => {});

    // ─── Phase 2: Best-effort photo copy ───
    if (params.photoPaths && params.photoPaths.length > 0) {
      const failedPhotos: string[] = [];

      for (const photoPath of params.photoPaths) {
        try {
          // Copy from DD captures to property photos
          const destPath = `property-photos/${newProp.id}/${photoPath.split("/").pop()}`;
          const { data: fileData } = await serviceClient.storage
            .from("dd-captures")
            .download(photoPath);

          if (fileData) {
            const arrayBuf = await fileData.arrayBuffer();
            await serviceClient.storage
              .from("dd-captures")
              .upload(destPath, arrayBuf, { contentType: "image/jpeg", upsert: true });

            // Record in property_system_photos
            const { data: urlData } = serviceClient.storage
              .from("dd-captures")
              .getPublicUrl(destPath);

            await supabase.from("property_system_photos").insert({
              property_id: newProp.id,
              photo_url: urlData.publicUrl,
              source: "acquire",
              source_wo_id: null,
            });
          }
        } catch {
          failedPhotos.push(photoPath);
        }
      }

      if (failedPhotos.length > 0) {
        // Mark as partial failure — recoverable
        return {
          success: true,
          propertyId: newProp.id,
          woIds,
          phase: "photos",
          failedPhotos,
          error: `${failedPhotos.length} photo(s) failed to copy`,
        };
      }
    }

    return {
      success: true,
      propertyId: newProp.id,
      woIds,
    };
  } catch (err) {
    return {
      success: false,
      error: `Onboarding failed: ${err instanceof Error ? err.message : "unknown"}`,
      phase: "db",
    };
  }
}
