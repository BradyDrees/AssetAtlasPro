"use server";

import { createClient } from "@/lib/supabase/server";
import { requireVendorRole } from "@/lib/vendor/role-helpers";
import type { PropertyContext, PropertySystem } from "@/lib/vendor/property-context-types";

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
