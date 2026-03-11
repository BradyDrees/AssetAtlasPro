"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  VALID_SYSTEM_TYPES,
  type SystemType,
  type PropertySystemPhotoRow,
} from "@/lib/home/system-types";
import { emitEvent } from "@/lib/platform/domain-events";
import {
  SEASONAL_TASKS,
  getSeasonYear,
  type SeasonalTask,
} from "@/lib/home/seasonal-tasks";
import {
  computeHealthScore,
  type SystemExtras,
} from "@/lib/home/health-score";
import type { PropertyPassportData } from "@/lib/home/passport-types";

function assertSystemType(v: string): asserts v is SystemType {
  if (!VALID_SYSTEM_TYPES.includes(v as SystemType)) {
    throw new Error("Invalid system type");
  }
}

// ─── Property update types ────────────────────────────────
interface UpdatePropertyInput {
  id: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  property_type?: string;
  year_built?: number | null;
  sqft?: number | null;
  beds?: number | null;
  baths?: number | null;
  hvac_model?: string;
  hvac_age?: number | null;
  water_heater_type?: string;
  water_heater_age?: number | null;
  electrical_panel?: string;
  roof_material?: string;
  roof_age?: number | null;
  gate_code?: string;
  lockbox_code?: string;
  alarm_code?: string;
  pet_warnings?: string;
  parking_instructions?: string;
}

/**
 * Update a homeowner property record.
 */
export async function updateProperty(
  input: UpdatePropertyInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { id, ...updates } = input;

    const { error } = await supabase
      .from("homeowner_properties")
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Something went wrong",
    };
  }
}

/**
 * Get the current user's property.
 */
export async function getMyProperty() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data } = await supabase
    .from("homeowner_properties")
    .select("*")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return data;
}

// ─── System Photo Actions ─────────────────────────────────

/**
 * Fetch all system photos for a property, grouped by system_type.
 */
export async function getSystemPhotos(propertyId: string) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("property_system_photos")
    .select(
      "id, property_id, system_type, storage_path, caption, sort_order, created_at, source"
    )
    .eq("property_id", propertyId)
    .order("system_type", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: false });

  if (error) throw error;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const grouped = {} as Record<SystemType, PropertySystemPhotoRow[]>;
  for (const row of (data ?? []) as PropertySystemPhotoRow[]) {
    const t = row.system_type as SystemType;
    (grouped[t] ||= []).push(row);
  }
  return grouped;
}

/**
 * Upload a system photo. File should arrive pre-compressed from the client.
 * Storage path: systems/{propertyId}/{systemType}/{uuid}.jpg
 */
export async function uploadSystemPhoto(
  propertyId: string,
  systemTypeRaw: string,
  formData: FormData
): Promise<PropertySystemPhotoRow> {
  assertSystemType(systemTypeRaw);
  const systemType = systemTypeRaw as SystemType;

  const supabase = await createClient();

  const file = formData.get("file");
  if (!(file instanceof File)) throw new Error("No file provided");

  const caption = (formData.get("caption") as string | null) ?? null;

  const filename = `${crypto.randomUUID()}.jpg`;
  const storagePath = `systems/${propertyId}/${systemType}/${filename}`;

  const { error: upErr } = await supabase.storage
    .from("dd-captures")
    .upload(storagePath, file, {
      contentType: file.type || "image/jpeg",
      upsert: false,
    });

  if (upErr) throw upErr;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { data: row, error: insErr } = await supabase
    .from("property_system_photos")
    .insert({
      property_id: propertyId,
      system_type: systemType,
      uploaded_by: user.id,
      storage_path: storagePath,
      caption,
      source: "homeowner",
      sort_order: 0,
    })
    .select(
      "id, property_id, system_type, storage_path, caption, sort_order, created_at, source"
    )
    .single();

  if (insErr) {
    // Rollback storage upload
    await supabase.storage.from("dd-captures").remove([storagePath]);
    throw insErr;
  }

  return row as PropertySystemPhotoRow;
}

/**
 * Delete a system photo — removes from storage then DB.
 */
export async function deleteSystemPhoto(
  photoId: string
): Promise<{ ok: true }> {
  const supabase = await createClient();

  const { data: photo, error: selErr } = await supabase
    .from("property_system_photos")
    .select("id, storage_path")
    .eq("id", photoId)
    .single();

  if (selErr) throw selErr;

  const { error: delStorageErr } = await supabase.storage
    .from("dd-captures")
    .remove([photo.storage_path]);

  if (delStorageErr) throw delStorageErr;

  const { error: delDbErr } = await supabase
    .from("property_system_photos")
    .delete()
    .eq("id", photoId);

  if (delDbErr) throw delDbErr;

  return { ok: true };
}

/**
 * Count system photos for a property (for wizard encouragement banner).
 */
export async function getSystemPhotoCount(
  propertyId: string
): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("property_system_photos")
    .select("*", { count: "exact", head: true })
    .eq("property_id", propertyId);

  if (error) throw error;
  return count ?? 0;
}

// ─── Maintenance Alerts ────────────────────────────────

/**
 * Fetch active maintenance alerts for the current user's property.
 */
export async function getMaintenanceAlerts(): Promise<
  Array<{
    id: string;
    system_type: string;
    threshold_percent: number;
    source_snapshot: Record<string, unknown> | null;
  }>
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  // Get user's property
  const { data: prop } = await supabase
    .from("homeowner_properties")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (!prop) return [];

  const { data: alerts } = await supabase
    .from("property_maintenance_alerts")
    .select("id, system_type, threshold_percent, source_snapshot")
    .eq("property_id", prop.id)
    .eq("status", "active")
    .order("threshold_percent", { ascending: false });

  return (alerts ?? []) as Array<{
    id: string;
    system_type: string;
    threshold_percent: number;
    source_snapshot: Record<string, unknown> | null;
  }>;
}

/**
 * Dismiss a maintenance alert (90-day cooldown before re-alerting).
 */
export async function dismissMaintenanceAlert(
  alertId: string
): Promise<{ error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  // Verify ownership through property
  const { data: alert } = await supabase
    .from("property_maintenance_alerts")
    .select("id, property_id")
    .eq("id", alertId)
    .single();

  if (!alert) return { error: "Alert not found" };

  const { data: prop } = await supabase
    .from("homeowner_properties")
    .select("user_id")
    .eq("id", alert.property_id)
    .single();

  if (prop?.user_id !== user.id) return { error: "Unauthorized" };

  const { error } = await supabase
    .from("property_maintenance_alerts")
    .update({
      status: "dismissed",
      dismissed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", alertId);

  if (error) return { error: error.message };
  return {};
}

// ─── Create Property (Inline from Property Page) ──────────
interface CreatePropertyForUserInput {
  address: string;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  property_type?: string | null;
}

/**
 * Create a property for the current user.
 * Idempotent: if the user already has a property, returns the existing one.
 * Name avoids hardcoding single-property assumption.
 */
export async function createPropertyForUser(
  input: CreatePropertyForUserInput
): Promise<{ success: boolean; propertyId?: string; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // Idempotent: check for existing property
    const { data: existing } = await supabase
      .from("homeowner_properties")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existing) {
      return { success: true, propertyId: existing.id };
    }

    // Create the property
    const { data: newProp, error: insertErr } = await supabase
      .from("homeowner_properties")
      .insert({
        user_id: user.id,
        address: input.address,
        city: input.city ?? null,
        state: input.state ?? null,
        zip: input.zip ?? null,
        property_type: input.property_type ?? null,
      })
      .select("id")
      .single();

    if (insertErr) {
      return { success: false, error: insertErr.message };
    }

    // Emit domain event
    emitEvent(
      "property.created",
      "property",
      newProp.id,
      { origin_module: "home", property_id: newProp.id },
      { id: user.id, type: "user" }
    );

    return { success: true, propertyId: newProp.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Something went wrong",
    };
  }
}

// ─── Update Access Details (Narrow Action) ─────────────────
interface UpdateAccessDetailsInput {
  propertyId: string;
  parking_instructions?: string | null;
  gate_code?: string | null;
  lockbox_code?: string | null;
  alarm_code?: string | null;
}

/**
 * Narrow action — only writes gate_code, lockbox_code, alarm_code,
 * parking_instructions. Cannot overwrite unrelated property fields.
 */
export async function updatePropertyAccessDetails(
  input: UpdateAccessDetailsInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    const { error } = await supabase
      .from("homeowner_properties")
      .update({
        gate_code: input.gate_code ?? null,
        lockbox_code: input.lockbox_code ?? null,
        alarm_code: input.alarm_code ?? null,
        parking_instructions: input.parking_instructions ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", input.propertyId)
      .eq("user_id", user.id);

    if (error) {
      return { success: false, error: error.message };
    }

    // Emit domain event
    emitEvent(
      "property.access_updated",
      "property",
      input.propertyId,
      { origin_module: "home", property_id: input.propertyId },
      { id: user.id, type: "user" }
    );

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Something went wrong",
    };
  }
}

// ─── Seasonal Reminders ──────────────────────────────────

import type { VisibleReminder } from "@/lib/home/seasonal-reminder-types";

/**
 * Get seasonal reminders for the current user.
 * Filters by: current month, property type, and dismissals.
 */
export async function getSeasonalReminders(): Promise<VisibleReminder[]> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const seasonYear = getSeasonYear(now);

  // Get property type
  const { data: prop } = await supabase
    .from("homeowner_properties")
    .select("id, property_type")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  // Filter tasks by month and property type
  const applicable = SEASONAL_TASKS.filter((task) => {
    if (!task.months.includes(currentMonth)) return false;
    if (
      task.property_types &&
      prop?.property_type &&
      !task.property_types.includes(prop.property_type)
    ) {
      return false;
    }
    return true;
  });

  if (applicable.length === 0) return [];

  // Get dismissals for this season_year
  const { data: dismissals } = await supabase
    .from("homeowner_dismissed_reminders")
    .select("reminder_id")
    .eq("user_id", user.id)
    .eq("season_year", seasonYear);

  const dismissedSet = new Set((dismissals ?? []).map((d) => d.reminder_id));

  return applicable
    .filter((task) => !dismissedSet.has(task.id))
    .map((task) => ({ ...task, seasonYear }));
}

/**
 * Dismiss a seasonal reminder for this season_year.
 */
export async function dismissReminder(
  reminderId: string,
  seasonYear: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Upsert to handle duplicate dismiss attempts
    const { error } = await supabase
      .from("homeowner_dismissed_reminders")
      .upsert(
        {
          user_id: user.id,
          reminder_id: reminderId,
          season_year: seasonYear,
        },
        { onConflict: "user_id,reminder_id,season_year" }
      );

    if (error) return { success: false, error: error.message };

    emitEvent(
      "seasonal_reminder.dismissed",
      "seasonal_reminder",
      reminderId,
      { origin_module: "home", season_year: seasonYear },
      { id: user.id, type: "user" }
    );

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Something went wrong",
    };
  }
}

// ─── Property Passport ──────────────────────────────────

/**
 * Generate (or rotate) a passport token for the user's property.
 * Always replaces the old token — old URL becomes instantly invalid.
 */
export async function generatePassportToken(): Promise<{
  success: boolean;
  token?: string;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // Get user's property
    const { data: prop } = await supabase
      .from("homeowner_properties")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!prop) return { success: false, error: "No property found" };

    // Generate new UUID token
    const token = crypto.randomUUID();

    const { error } = await supabase
      .from("homeowner_properties")
      .update({ passport_token: token })
      .eq("id", prop.id);

    if (error) return { success: false, error: error.message };

    emitEvent(
      "passport.generated",
      "property",
      prop.id,
      { origin_module: "home" },
      { id: user.id, type: "user" }
    );

    return { success: true, token };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Something went wrong",
    };
  }
}

/**
 * Revoke the current passport token. URL returns 404 afterwards.
 */
export async function revokePassportToken(): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    const { data: prop } = await supabase
      .from("homeowner_properties")
      .select("id")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!prop) return { success: false, error: "No property found" };

    const { error } = await supabase
      .from("homeowner_properties")
      .update({ passport_token: null })
      .eq("id", prop.id);

    if (error) return { success: false, error: error.message };

    emitEvent(
      "passport.revoked",
      "property",
      prop.id,
      { origin_module: "home" },
      { id: user.id, type: "user" }
    );

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Something went wrong",
    };
  }
}

/**
 * Public fetch — get property passport data by token.
 * Uses service-role client to bypass RLS (public page, no auth).
 * NEVER returns: access codes, vendor pricing, homeowner identity,
 * pet warnings, or parking instructions.
 */
export async function getPropertyPassport(
  token: string
): Promise<PropertyPassportData | null> {
  if (!token) return null;

  const supabase = createServiceClient();

  // Find property by passport_token
  const { data: prop } = await supabase
    .from("homeowner_properties")
    .select(
      "id, address, city, state, zip, property_type, year_built, sqft, beds, baths, hvac_age, water_heater_age, roof_age, user_id"
    )
    .eq("passport_token", token)
    .maybeSingle();

  if (!prop) return null;

  const today = new Date();
  const sixMonthsAgo = new Date(today.getTime() - 180 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];

  // Parallel queries for health score data + extras
  const [photosRes, docsRes, recentWoRes, alertsRes, systemPhotosRes, maintenanceRes] =
    await Promise.all([
      // System photos (for health score bonus)
      supabase
        .from("property_system_photos")
        .select("system_type")
        .eq("property_id", prop.id),

      // Documents (for health score bonus)
      supabase
        .from("homeowner_documents")
        .select("system_type")
        .eq("property_id", prop.id)
        .not("system_type", "is", null),

      // Recent completed WOs (for health score bonus)
      supabase
        .from("vendor_work_orders")
        .select("trade")
        .eq("homeowner_id", prop.user_id)
        .in("status", ["completed", "done_pending_approval", "invoiced", "paid"])
        .gte("completed_at", sixMonthsAgo),

      // Active maintenance alerts (for health score penalty)
      supabase
        .from("homeowner_maintenance_alerts")
        .select("system_type")
        .eq("property_id", prop.id)
        .eq("is_resolved", false),

      // System photos (for display — public URLs)
      supabase
        .from("property_system_photos")
        .select("system_type, photo_url")
        .eq("property_id", prop.id)
        .order("created_at", { ascending: false }),

      // Maintenance history — trade + completed_at only (safe to expose)
      supabase
        .from("vendor_work_orders")
        .select("trade, completed_at")
        .eq("homeowner_id", prop.user_id)
        .in("status", ["completed", "done_pending_approval", "invoiced", "paid"])
        .not("completed_at", "is", null)
        .order("completed_at", { ascending: false })
        .limit(20),
    ]);

  // Build health score extras
  const tradeToSystem: Record<string, string> = {
    hvac: "hvac",
    plumbing: "water_heater",
    roofing: "roof",
    electrical: "electrical_panel",
  };

  const extras: SystemExtras = {
    systemsWithPhotos: [
      ...new Set((photosRes.data ?? []).map((r) => r.system_type)),
    ],
    systemsWithDocs: [
      ...new Set(
        (docsRes.data ?? [])
          .map((r) => r.system_type)
          .filter(Boolean) as string[]
      ),
    ],
    systemsWithRecentWo: [
      ...new Set(
        (recentWoRes.data ?? [])
          .map((r) => tradeToSystem[r.trade ?? ""] ?? "")
          .filter(Boolean)
      ),
    ],
  };

  const activeAlerts = (alertsRes.data ?? []).map((a) => ({
    system_type: a.system_type,
  }));

  const healthScore = computeHealthScore(
    {
      hvac_age: prop.hvac_age,
      water_heater_age: prop.water_heater_age,
      roof_age: prop.roof_age,
    },
    extras,
    activeAlerts
  );

  // Format maintenance history — trade + month/year only
  const monthFormatter = new Intl.DateTimeFormat("en-US", {
    month: "long",
    year: "numeric",
  });

  const maintenanceHistory = (maintenanceRes.data ?? []).map((wo) => ({
    trade: wo.trade ?? "general",
    completedMonth: monthFormatter.format(new Date(wo.completed_at)),
  }));

  // System photos — keep unique per system_type (latest)
  const seenSystems = new Set<string>();
  const systemPhotos = (systemPhotosRes.data ?? [])
    .filter((p) => {
      if (seenSystems.has(p.system_type)) return false;
      seenSystems.add(p.system_type);
      return true;
    })
    .map((p) => ({
      system_type: p.system_type,
      photo_url: p.photo_url,
    }));

  return {
    address: prop.address,
    city: prop.city,
    state: prop.state,
    zip: prop.zip,
    property_type: prop.property_type,
    year_built: prop.year_built,
    sqft: prop.sqft,
    beds: prop.beds,
    baths: prop.baths,
    overallScore: healthScore.overall,
    grade: healthScore.grade,
    confidence: healthScore.confidence,
    systemBreakdown: healthScore.breakdown.map((b) => ({
      system: b.system,
      age: b.age,
      score: b.score,
      lifespan: b.lifespan,
      known: b.known,
    })),
    systemPhotos,
    maintenanceHistory,
  };
}
