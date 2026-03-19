import { getOperateProject } from "@/app/actions/operate-projects";
import { ProjectDetailShell } from "@/components/operate/projects/project-detail-shell";
import { getLocale } from "next-intl/server";
import { notFound } from "next/navigation";

interface Props {
  params: Promise<{ projectId: string }>;
}

export default async function OperateProjectDetailPage({ params }: Props) {
  const { projectId } = await params;
  const locale = (await getLocale()) as "en" | "es";
  const messages = (
    await import(`@/messages/${locale}/operate-projects.json`)
  ).default;

  const result = await getOperateProject(projectId);

  if (result.error || !result.data) {
    notFound();
  }

  return (
    <div className="max-w-5xl mx-auto">
      <ProjectDetailShell project={result.data} messages={messages} />
    </div>
  );
}
