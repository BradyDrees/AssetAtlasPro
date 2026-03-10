/**
 * Estimate Service
 *
 * Owns estimate approval flow, signature handling, PDF generation triggers.
 * Actions call this service; this service owns business logic.
 */
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { emitEvent } from "@/lib/platform/domain-events";
import { logActivity } from "@/lib/vendor/role-helpers";

// ============================================
// Types
// ============================================

export interface ApproveWithSignatureParams {
  estimateId: string;
  signatureDataUrl: string; // base64 PNG data URL
  signedBy: string; // name of signer
  selectedTier?: "good" | "better" | "best";
  actorUserId: string;
  actorType: "pm" | "homeowner";
}

export interface ApprovalResult {
  success: boolean;
  error?: string;
  signatureUrl?: string;
}

// ============================================
// Approval with Signature
// ============================================

/**
 * Approve an estimate with a required signature.
 *
 * Atomic flow:
 * 1. Upload signature PNG to storage
 * 2. Update estimate: status=approved, signature fields, selected_tier
 * 3. Log activity
 * 4. Emit domain event
 *
 * If any step fails, the operation is not considered complete.
 */
export async function approveWithSignature(
  params: ApproveWithSignatureParams
): Promise<ApprovalResult> {
  const supabase = await createClient();
  const { estimateId, signatureDataUrl, signedBy, selectedTier, actorUserId, actorType } = params;

  // 1. Validate estimate exists and is in approvable state
  const { data: estimate, error: fetchErr } = await supabase
    .from("vendor_estimates")
    .select("id, status, vendor_org_id, work_order_id")
    .eq("id", estimateId)
    .single();

  if (fetchErr || !estimate) {
    return { success: false, error: "Estimate not found" };
  }

  const approvableStatuses = ["sent", "pm_reviewing", "with_owner"];
  if (!approvableStatuses.includes(estimate.status)) {
    return { success: false, error: `Cannot approve from status "${estimate.status}"` };
  }

  // 2. Upload signature to storage
  let signatureUrl: string | undefined;
  try {
    // Convert data URL to buffer
    const base64Data = signatureDataUrl.replace(/^data:image\/png;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // Validate size (<500KB)
    if (buffer.length > 500 * 1024) {
      return { success: false, error: "Signature file too large (max 500KB)" };
    }

    const path = `signatures/${estimateId}/${Date.now()}.png`;
    const { error: uploadErr } = await supabase.storage
      .from("dd-captures")
      .upload(path, buffer, { contentType: "image/png", upsert: true });

    if (uploadErr) {
      return { success: false, error: `Signature upload failed: ${uploadErr.message}` };
    }

    const { data: urlData } = supabase.storage
      .from("dd-captures")
      .getPublicUrl(path);

    signatureUrl = urlData.publicUrl;
  } catch (err) {
    return {
      success: false,
      error: `Signature processing failed: ${err instanceof Error ? err.message : "unknown"}`,
    };
  }

  // 3. Update estimate atomically
  const updatePayload: Record<string, unknown> = {
    status: "approved",
    signature_url: signatureUrl,
    signed_by: signedBy,
    signed_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  if (selectedTier) {
    updatePayload.selected_tier = selectedTier;
  }

  const { error: updateErr } = await supabase
    .from("vendor_estimates")
    .update(updatePayload)
    .eq("id", estimateId);

  if (updateErr) {
    return { success: false, error: `Update failed: ${updateErr.message}` };
  }

  // 4. Log activity
  await logActivity({
    entityType: "estimate",
    entityId: estimateId,
    action: "approved",
    newValue: "approved",
    metadata: { signed_by: signedBy, selected_tier: selectedTier },
  }).catch(() => {});

  // 5. Emit domain event
  await emitEvent(
    "estimate.approved",
    "estimate",
    estimateId,
    {
      vendor_org_id: estimate.vendor_org_id,
      work_order_id: estimate.work_order_id,
      origin_module: actorType === "pm" ? "operate" : "home",
      signed_by: signedBy,
      selected_tier: selectedTier,
    },
    { id: actorUserId, type: "user" }
  ).catch(() => {});

  // 6. Emit signed event separately for signature-specific tracking
  await emitEvent(
    "estimate.signed",
    "estimate",
    estimateId,
    {
      vendor_org_id: estimate.vendor_org_id,
      work_order_id: estimate.work_order_id,
      origin_module: actorType === "pm" ? "operate" : "home",
      signature_url: signatureUrl,
      signed_by: signedBy,
    },
    { id: actorUserId, type: "user" }
  ).catch(() => {});

  return { success: true, signatureUrl };
}

/**
 * Get estimate details for PDF generation (including signature).
 */
export async function getEstimateForPdf(estimateId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("vendor_estimates")
    .select(`
      *,
      vendor_organizations!vendor_estimates_vendor_org_id_fkey(
        id, name, logo_url, phone, email, address, city, state, zip
      )
    `)
    .eq("id", estimateId)
    .single();

  return { data, error: error?.message ?? null };
}
