import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { InspectionProjectCard } from "@/components/inspection-project-card";
import { CreateInspectionButton } from "@/components/create-inspection-button";

export default async function InspectionsPage() {
  const supabase = await createClient();
  const t = await getTranslations();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fire owned projects + share lookup in parallel
  const [{ data: ownedProjects }, { data: shares }] = await Promise.all([
    supabase
      .from("inspection_projects")
      .select("*")
      .eq("owner_id", user?.id ?? "")
      .order("created_at", { ascending: false }),
    supabase
      .from("inspection_project_shares")
      .select("project_id")
      .eq("shared_with_user_id", user?.id ?? ""),
  ]);

  // Fetch shared projects (depends on shares result)
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
      <div className="flex items-center justify-between mb-6 bg-[radial-gradient(ellipse_at_top_left,_var(--brand-900)_0%,_transparent_50%),radial-gradient(ellipse_at_bottom_right,_var(--brand-900)_0%,_var(--charcoal-950)_60%)] bg-charcoal-900 -mx-4 -mt-4 md:-mx-6 md:-mt-6 px-4 py-5 md:px-6 rounded-b-xl">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {t("dashboard.propertyInspections")}
          </h1>
          <p className="text-gold-300 text-sm mt-0.5">{t("dashboard.pcaProjects")}</p>
        </div>
        <CreateInspectionButton />
      </div>

      {hasAny ? (
        <div className="space-y-6">
          {/* My Inspections */}
          {ownedProjects && ownedProjects.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-content-quaternary uppercase tracking-wider mb-3">
                {t("dashboard.myInspections")}
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
              <h2 className="text-sm font-bold text-content-quaternary uppercase tracking-wider mb-3">
                {t("dashboard.sharedWithMe")}
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
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-brand-50 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-content-primary mb-2">
            {t("dashboard.noInspections")}
          </h3>
          <p className="text-content-quaternary mb-6">
            {t("dashboard.createFirstInspection")}
          </p>
          <CreateInspectionButton />
        </div>
      )}
    </div>
  );
}
