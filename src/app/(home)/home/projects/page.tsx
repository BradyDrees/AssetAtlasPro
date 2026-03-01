import { createClient } from "@/lib/supabase/server";
import { ProjectsContent } from "./projects-content";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: projects } = await supabase
    .from("projects")
    .select(
      "id, title, description, status, template_name, total_trades, completed_trades, estimated_cost_low, estimated_cost_high, created_at"
    )
    .eq("homeowner_id", user!.id)
    .order("created_at", { ascending: false });

  return <ProjectsContent projects={projects ?? []} />;
}
