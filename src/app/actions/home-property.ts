"use server";

import { createClient } from "@/lib/supabase/server";

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
