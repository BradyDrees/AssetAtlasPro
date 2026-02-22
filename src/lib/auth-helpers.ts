"use server";

import { createClient } from "@/lib/supabase/server";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Assert user is authenticated. Returns { supabase, user } or throws.
 */
export async function assertAuth() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  return { supabase, user };
}

/**
 * Assert user owns a resource. Queries the table for owner_id match.
 * Works with dd_projects, inspection_projects, unit_turn_batches.
 */
export async function assertOwnership(
  supabase: SupabaseClient,
  table: string,
  id: string,
  userId: string
) {
  const { data } = await supabase
    .from(table)
    .select("owner_id")
    .eq("id", id)
    .single();
  if (!data || data.owner_id !== userId) {
    throw new Error("Not authorized");
  }
}
