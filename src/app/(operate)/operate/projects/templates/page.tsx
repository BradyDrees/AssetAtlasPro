import { getStageTemplates } from "@/app/actions/operate-projects";
import { TemplateManager } from "@/components/operate/projects/template-manager";
import { getLocale } from "next-intl/server";

export default async function TemplatesPage() {
  const locale = (await getLocale()) as "en" | "es";
  const messages = (await import(`@/messages/${locale}/operate-projects.json`)).default;
  const { data: templates } = await getStageTemplates();

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <TemplateManager initialTemplates={templates} messages={messages} />
    </div>
  );
}
