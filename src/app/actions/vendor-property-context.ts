"use server";

import { createClient } from "@/lib/supabase/server";
import { requireVendorRole } from "@/lib/vendor/role-helpers";
import type { PropertyContext, PropertySystem } from "@/lib/vendor/property-context-types";
import type { SystemType } from "@/lib/home/system-types";
import { VALID_SYSTEM_TYPES } from "@/lib/home/system-types";

export async function getPropertyContextForWo(
  woId: string
): Promise<{ data?: PropertyContext; error?: string }> {
  try {
    await requireVendorRole();
    const supabase = await createClient();

    // Get the WO to check for homeowner linkage
    const { data: wo, error: woErr } = await supabase
      .from("vendor_work_orders")
      .select("homeowner_id, homeowner_property_id")
      .eq("id", woId)
      .single();

    if (woErr || !wo?.homeowner_property_id) {
      return {}; // No property linked — not an error, just no data
    }

    // Fetch property data
    const { data: prop, error: propErr } = await supabase
      .from("homeowner_properties")
      .select(
        "property_type, year_built, sqft, beds, baths, hvac_model, hvac_age, water_heater_type, water_heater_age, electrical_panel, roof_material, roof_age, gate_code, lockbox_code, alarm_code, pet_warnings, parking_instructions"
      )
      .eq("id", wo.homeowner_property_id)
      .eq("user_id", wo.homeowner_id)
      .single();

    if (propErr || !prop) {
      return {};
    }

    // Build systems array from flat columns
    const currentYear = new Date().getFullYear();
    const systems: PropertySystem[] = [];

    if (prop.hvac_model || prop.hvac_age != null) {
      systems.push({
        system_type: "HVAC",
        make: null,
        model: prop.hvac_model || null,
        year_installed: prop.hvac_age != null ? currentYear - prop.hvac_age : null,
        age_years: prop.hvac_age ?? null,
        condition: null,
      });
    }

    if (prop.water_heater_type || prop.water_heater_age != null) {
      systems.push({
        system_type: "Water Heater",
        make: null,
        model: prop.water_heater_type || null,
        year_installed:
          prop.water_heater_age != null ? currentYear - prop.water_heater_age : null,
        age_years: prop.water_heater_age ?? null,
        condition: null,
      });
    }

    if (prop.roof_material || prop.roof_age != null) {
      systems.push({
        system_type: "Roof",
        make: null,
        model: prop.roof_material || null,
        year_installed: prop.roof_age != null ? currentYear - prop.roof_age : null,
        age_years: prop.roof_age ?? null,
        condition: null,
      });
    }

    if (prop.electrical_panel) {
      systems.push({
        system_type: "Electrical",
        make: null,
        model: prop.electrical_panel,
        year_installed: null,
        age_years: null,
        condition: null,
      });
    }

    // Count past completed WOs for this property
    const { count } = await supabase
      .from("vendor_work_orders")
      .select("id", { count: "exact", head: true })
      .eq("homeowner_property_id", wo.homeowner_property_id)
      .eq("status", "completed")
      .neq("id", woId);

    return {
      data: {
        property_type: prop.property_type || null,
        year_built: prop.year_built ?? null,
        sqft: prop.sqft ?? null,
        beds: prop.beds ?? null,
        baths: prop.baths ?? null,
        systems,
        access_codes: prop.alarm_code || null,
        gate_code: prop.gate_code || null,
        lockbox_code: prop.lockbox_code || null,
        pet_info: prop.pet_warnings || null,
        parking_notes: prop.parking_instructions || null,
        past_job_count: count ?? 0,
      },
    };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : "Failed to load property context",
    };
  }
}

// System type → property column mapping for latest-value updates
const SYSTEM_TYPE_COLUMNS: Record<string, { model?: string; age?: string; type?: string; material?: string }> = {
  hvac: { model: "hvac_model", age: "hvac_age" },
  water_heater: { type: "water_heater_type", age: "water_heater_age" },
  electrical_panel: { model: "electrical_panel" },
  roof: { material: "roof_material", age: "roof_age" },
};

/**
 * Vendor logs system info after completing a job.
 * - Photos are APPEND-ONLY (new rows in property_system_photos)
 * - System metadata is LATEST-VALUE (overwrites property-level columns)
 * - Audit trail preserved via source='vendor' + source_wo_id
 */
export async function logSystemInfo(input: {
  woId: string;
  systemType: SystemType;
  make?: string;
  model?: string;
  serial?: string;
  age?: number;
  photos?: string[]; // base64 image strings
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { vendor_org_id } = await requireVendorRole();
    const supabase = await createClient();

    // Validate system type
    if (!VALID_SYSTEM_TYPES.includes(input.systemType)) {
      return { success: false, error: "Invalid system type" };
    }

    // Get WO + linked property
    const { data: wo } = await supabase
      .from("vendor_work_orders")
      .select("id, homeowner_property_id, homeowner_id, vendor_org_id")
      .eq("id", input.woId)
      .single();

    if (!wo || wo.vendor_org_id !== vendor_org_id) {
      return { success: false, error: "Work order not found or access denied" };
    }

    if (!wo.homeowner_property_id) {
      return { success: false, error: "No property linked to this work order" };
    }

    // Get user for attribution
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated" };

    // 1. Update property-level metadata (latest-value overwrite)
    const colMap = SYSTEM_TYPE_COLUMNS[input.systemType];
    if (colMap) {
      const updates: Record<string, string | number | null> = {};

      if (input.model) {
        const col = colMap.model || colMap.type || colMap.material;
        if (col) updates[col] = input.model;
      }
      if (input.age != null) {
        const ageCol = colMap.age;
        if (ageCol) updates[ageCol] = input.age;
      }

      if (Object.keys(updates).length > 0) {
        await supabase
          .from("homeowner_properties")
          .update(updates)
          .eq("id", wo.homeowner_property_id);
      }
    }

    // 2. Upload photos (append-only)
    if (input.photos && input.photos.length > 0) {
      for (let i = 0; i < input.photos.length; i++) {
        const base64 = input.photos[i];
        // Convert base64 to buffer
        const matches = base64.match(/^data:image\/(.*?);base64,(.*)$/);
        if (!matches) continue;

        const ext = matches[1] === "jpeg" ? "jpg" : matches[1];
        const buffer = Buffer.from(matches[2], "base64");
        const fileName = `${crypto.randomUUID()}.${ext}`;
        const storagePath = `systems/${wo.homeowner_property_id}/${input.systemType}/${fileName}`;

        const { error: uploadErr } = await supabase.storage
          .from("dd-captures")
          .upload(storagePath, buffer, {
            contentType: `image/${matches[1]}`,
            upsert: false,
          });

        if (!uploadErr) {
          await supabase.from("property_system_photos").insert({
            property_id: wo.homeowner_property_id,
            system_type: input.systemType,
            uploaded_by: user.id,
            storage_path: storagePath,
            caption: input.make
              ? `${input.make}${input.model ? ` ${input.model}` : ""}${input.serial ? ` (S/N: ${input.serial})` : ""}`
              : null,
            source: "vendor",
            source_wo_id: wo.id,
            sort_order: i,
          });
        }
      }
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to log system info",
    };
  }
}

/**
 * Get system photos for a property (vendor view, scoped by WO access)
 */
export async function getSystemPhotosForVendor(
  woId: string
): Promise<{ data: Array<{
  id: string;
  system_type: string;
  storage_path: string;
  caption: string | null;
  source: string;
  source_wo_id: string | null;
  created_at: string;
}>; error?: string }> {
  try {
    await requireVendorRole();
    const supabase = await createClient();

    // Get WO property
    const { data: wo } = await supabase
      .from("vendor_work_orders")
      .select("homeowner_property_id")
      .eq("id", woId)
      .single();

    if (!wo?.homeowner_property_id) {
      return { data: [] };
    }

    const { data: photos, error } = await supabase
      .from("property_system_photos")
      .select("id, system_type, storage_path, caption, source, source_wo_id, created_at")
      .eq("property_id", wo.homeowner_property_id)
      .order("system_type")
      .order("sort_order")
      .order("created_at", { ascending: false });

    if (error) {
      return { data: [], error: error.message };
    }

    return { data: photos ?? [] };
  } catch (err) {
    return {
      data: [],
      error: err instanceof Error ? err.message : "Failed to load photos",
    };
  }
}
