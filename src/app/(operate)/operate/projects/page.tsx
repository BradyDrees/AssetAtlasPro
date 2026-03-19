import { getOperateProjects, getStageTemplates } from "@/app/actions/operate-projects";
import { PageHeader } from "@/components/ui/page-header";
import { ProjectsBoard } from "@/components/operate/projects/projects-board";
import { getLocale } from "next-intl/server";

export default async function OperateProjectsPage() {
  const locale = (await getLocale()) as "en" | "es";
  const messages = (await import(`@/messages/${locale}/operate-projects.json`)).default;

  const [projectsResult, templatesResult] = await Promise.all([
    getOperateProjects(),
    getStageTemplates(),
  ]);

  return (
    <div className="max-w-6xl mx-auto space-y-5">
      <ProjectsBoard
        initialProjects={projectsResult.data}
        templates={templatesResult.data}
        messages={messages}
      />
    </div>
  );
}
