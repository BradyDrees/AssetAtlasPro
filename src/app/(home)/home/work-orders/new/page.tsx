import { createClient } from "@/lib/supabase/server";
import { NewWorkOrderWizard } from "./new-wo-wizard";

export default async function NewWorkOrderPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get user's property for the WO
  const { data: property } = await supabase
    .from("homeowner_properties")
    .select("id, address")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  return <NewWorkOrderWizard propertyId={property?.id ?? ""} propertyAddress={property?.address ?? ""} />;
}
