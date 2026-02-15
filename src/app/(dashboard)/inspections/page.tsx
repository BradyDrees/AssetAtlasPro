import { createClient } from "@/lib/supabase/server";
import { InspectionProjectCard } from "@/components/inspection-project-card";
import { CreateInspectionButton } from "@/components/create-inspection-button";

export const dynamic = "force-dynamic";

export default async function InspectionsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch projects owned by current user
  const { data: ownedProjects } = await supabase
    .from("inspection_projects")
    .select("*")
    .eq("owner_id", user?.id ?? "")
    .order("created_at", { ascending: false });

  // Fetch projects shared with current user
  const { data: shares } = await supabase
    .from("inspection_project_shares")
    .select("project_id")
    .eq("shared_with_user_id", user?.id ?? "");

  const sharedProjectIds = (shares ?? []).map((s: { project_id: string }) => s.project_id);
  let sharedProjects: typeof ownedProjects = [];
  if (sharedProjectIds.length > 0) {
    const { data } = await supabase
      .from("inspection_projects")
      .select("*")
      .in("id", sharedProjectIds)
      .order("created_at", { ascending: false });
    sharedProjects = data ?? [];
  }

  const hasAny =
    (ownedProjects && ownedProjects.length > 0) ||
    (sharedProjects && sharedProjects.length > 0);

  return (
    <div>
      {/* Page header with gradient */}
      <div className="flex items-center justify-between mb-6 bg-gradient-to-r from-brand-900 to-brand-700 -mx-4 -mt-4 md:-mx-6 md:-mt-6 px-4 py-5 md:px-6 rounded-b-xl">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Property Inspections
          </h1>
          <p className="text-gold-300 text-sm mt-0.5">PCA Inspection Projects</p>
        </div>
        <CreateInspectionButton />
      </div>

      {hasAny ? (
        <div className="space-y-6">
          {/* My Inspections */}
          {ownedProjects && ownedProjects.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                My Inspections
              </h2>
              <div className="space-y-3">
                {ownedProjects.map((project) => (
                  <InspectionProjectCard key={project.id} project={project} />
                ))}
              </div>
            </div>
          )}

          {/* Shared with Me */}
          {sharedProjects && sharedProjects.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
                Shared with Me
              </h2>
              <div className="space-y-3">
                {sharedProjects.map((project) => (
                  <InspectionProjectCard
                    key={project.id}
                    project={project}
                    isShared
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-brand-50 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            No inspections yet
          </h3>
          <p className="text-gray-500 mb-6">
            Create your first inspection project to start a property walkthrough.
          </p>
          <CreateInspectionButton />
        </div>
      )}
    </div>
  );
}
