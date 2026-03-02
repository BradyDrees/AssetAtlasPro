import { createClient } from "@/lib/supabase/server";
import { getSystemPhotoCount } from "@/app/actions/home-property";
import { NewWorkOrderWizard } from "./new-wo-wizard";

export default async function NewWorkOrderPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Get user's property with access + systems fields for gate checks
  const { data: property } = await supabase
    .from("homeowner_properties")
    .select(
      "id, address, gate_code, lockbox_code, alarm_code, parking_instructions, hvac_model, hvac_age, water_heater_type, water_heater_age, electrical_panel, roof_material, roof_age"
    )
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Fetch system photo count for encouragement banner
  const systemPhotoCount = property
    ? await getSystemPhotoCount(property.id)
    : 0;

  return (
    <NewWorkOrderWizard
      propertyId={property?.id ?? ""}
      propertyAddress={property?.address ?? ""}
      property={property}
      systemPhotoCount={systemPhotoCount}
    />
  );
}
