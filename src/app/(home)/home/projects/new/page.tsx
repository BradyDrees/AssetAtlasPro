import { createClient } from "@/lib/supabase/server";
import { NewProjectWizard } from "./new-project-wizard";

export default async function NewProjectPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get homeowner's first property
  const { data: property } = await supabase
    .from("homeowner_properties")
    .select("id, address")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Get available templates
  const { data: templates } = await supabase
    .from("project_templates")
    .select("*")
    .eq("is_active", true)
    .order("name");

  return (
    <NewProjectWizard
      propertyId={property?.id ?? ""}
      propertyAddress={property?.address ?? ""}
      templates={templates ?? []}
    />
  );
}
