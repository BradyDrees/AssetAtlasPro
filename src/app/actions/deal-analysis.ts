"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { CreateDealAnalysis, UpdateDealAnalysis } from "@/lib/deal-analysis-types";
import { DEFAULT_DEAL_DATA } from "@/lib/deal-analysis-types";

export async function createDealAnalysis(data: CreateDealAnalysis) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Not authenticated");

  const { data: deal, error } = await supabase
    .from("deal_analyses")
    .insert({
      ...data,
      owner_id: user.id,
      data: DEFAULT_DEAL_DATA,
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/deal-analysis");

  return deal.id;
}

export async function updateDealAnalysis(id: string, updates: UpdateDealAnalysis) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Verify ownership
  const { data: deal } = await supabase
    .from("deal_analyses")
    .select("owner_id")
    .eq("id", id)
    .single();
  if (!deal || deal.owner_id !== user.id) throw new Error("Not authorized");

  const { error } = await supabase
    .from("deal_analyses")
    .update(updates)
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/deal-analysis");
  revalidatePath(`/deal-analysis/${id}`);
}

export async function deleteDealAnalysis(id: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  // Verify ownership
  const { data: deal } = await supabase
    .from("deal_analyses")
    .select("owner_id")
    .eq("id", id)
    .single();
  if (!deal || deal.owner_id !== user.id) throw new Error("Not authorized");

  const { error } = await supabase
    .from("deal_analyses")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/deal-analysis");
}
