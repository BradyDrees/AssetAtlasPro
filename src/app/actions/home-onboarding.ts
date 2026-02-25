"use server";

import { createClient } from "@/lib/supabase/server";

interface CreatePropertyInput {
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  property_type?: "sfr" | "condo" | "townhouse" | "duplex";
  year_built?: number;
  sqft?: number;
  beds?: number;
  baths?: number;
  hvac_model?: string;
  hvac_age?: number;
  water_heater_type?: string;
  water_heater_age?: number;
  electrical_panel?: string;
  roof_material?: string;
  roof_age?: number;
  gate_code?: string;
  lockbox_code?: string;
  alarm_code?: string;
  pet_warnings?: string;
  parking_instructions?: string;
}

/**
 * Complete homeowner onboarding:
 * 1. Create the property record
 * 2. Assign the "owner" role in user_roles
 * 3. Update active_role in profiles
 */
export async function completeHomeOnboarding(
  input: CreatePropertyInput
): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated" };
    }

    // 1. Create the property
    const { error: propError } = await supabase
      .from("homeowner_properties")
      .insert({
        user_id: user.id,
        address: input.address,
        city: input.city ?? null,
        state: input.state ?? null,
        zip: input.zip ?? null,
        property_type: input.property_type ?? null,
        year_built: input.year_built ?? null,
        sqft: input.sqft ?? null,
        beds: input.beds ?? null,
        baths: input.baths ?? null,
        hvac_model: input.hvac_model ?? null,
        hvac_age: input.hvac_age ?? null,
        water_heater_type: input.water_heater_type ?? null,
        water_heater_age: input.water_heater_age ?? null,
        electrical_panel: input.electrical_panel ?? null,
        roof_material: input.roof_material ?? null,
        roof_age: input.roof_age ?? null,
        gate_code: input.gate_code ?? null,
        lockbox_code: input.lockbox_code ?? null,
        alarm_code: input.alarm_code ?? null,
        pet_warnings: input.pet_warnings ?? null,
        parking_instructions: input.parking_instructions ?? null,
      });

    if (propError) {
      console.error("Failed to create property:", propError);
      return { success: false, error: propError.message };
    }

    // 2. Assign the "owner" role (if not already assigned)
    const { data: existingRole } = await supabase
      .from("user_roles")
      .select("id")
      .eq("user_id", user.id)
      .eq("role", "owner")
      .single();

    if (!existingRole) {
      const { error: roleError } = await supabase
        .from("user_roles")
        .insert({
          user_id: user.id,
          role: "owner",
          is_active: true,
        });

      if (roleError) {
        console.error("Failed to assign owner role:", roleError);
        return { success: false, error: roleError.message };
      }
    }

    // 3. Update active_role in profiles
    await supabase
      .from("profiles")
      .update({ active_role: "owner" })
      .eq("id", user.id);

    return { success: true };
  } catch (err) {
    console.error("Onboarding error:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Something went wrong",
    };
  }
}
