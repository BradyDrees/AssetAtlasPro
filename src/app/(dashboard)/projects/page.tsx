import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { DDProjectCard } from "@/components/dd-project-card";
import { CreateDDProjectButton } from "@/components/create-dd-project-button";

export default async function ProjectsPage() {
  const supabase = await createClient();
  const t = await getTranslations();

  const { data: projects } = await supabase
    .from("dd_projects")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div>
      {/* Page header with gradient */}
      <div className="flex items-center justify-between mb-6 bg-[radial-gradient(ellipse_at_top_left,_var(--brand-900)_0%,_transparent_50%),radial-gradient(ellipse_at_bottom_right,_var(--brand-900)_0%,_var(--charcoal-950)_60%)] bg-charcoal-900 -mx-4 -mt-4 md:-mx-6 md:-mt-6 px-4 py-5 md:px-6 rounded-b-xl">
        <div>
          <h1 className="text-2xl font-bold text-white">
            {t("nav.dueDiligence")}
          </h1>
          <p className="text-gold-300 text-sm mt-0.5 capitalize">{t("dashboard.manageDDProjects")}</p>
        </div>
        <CreateDDProjectButton />
      </div>

      {projects && projects.length > 0 ? (
        <div className="space-y-3">
          {projects.map((project) => (
            <DDProjectCard key={project.id} project={project} />
          ))}
        </div>
      ) : (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-brand-50 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-content-primary mb-2">
            {t("dashboard.noDDProjects")}
          </h3>
          <p className="text-content-quaternary mb-6">
            {t("dashboard.createFirstDD")}
          </p>
          <CreateDDProjectButton />
        </div>
      )}
    </div>
  );
}
