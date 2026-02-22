"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function toggleProjectSection(
  projectSectionId: string,
  projectId: string,
  enabled: boolean
) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");

  const { error } = await supabase
    .from("dd_project_sections")
    .update({ enabled })
    .eq("id", projectSectionId);

  if (error) throw new Error(error.message);

  revalidatePath(`/projects/${projectId}`);
}
