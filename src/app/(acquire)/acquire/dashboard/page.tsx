import { createClient } from "@/lib/supabase/server";
import { AcquireDashboardContent } from "./dashboard-content";

export default async function AcquireDashboardPage() {
  const supabase = await createClient();

  const [ddResult, daResult] = await Promise.all([
    supabase.from("dd_projects").select("id", { count: "exact", head: true }),
    supabase.from("deal_analyses").select("id", { count: "exact", head: true }),
  ]);

  return (
    <AcquireDashboardContent
      ddCount={ddResult.count ?? 0}
      daCount={daResult.count ?? 0}
    />
  );
}
