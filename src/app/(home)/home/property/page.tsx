import { createClient } from "@/lib/supabase/server";
import { getSystemPhotos } from "@/app/actions/home-property";
import { PropertyContent } from "./property-content";

export default async function PropertyPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: property } = await supabase
    .from("homeowner_properties")
    .select("*")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  // Fetch system photos grouped by type
  const photosBySystem = property ? await getSystemPhotos(property.id) : {};

  return (
    <PropertyContent property={property} photosBySystem={photosBySystem} />
  );
}
