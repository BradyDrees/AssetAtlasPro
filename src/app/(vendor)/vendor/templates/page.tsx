import { getDocumentTemplates } from "@/app/actions/vendor-document-templates";
import { DocumentTemplateManager } from "@/components/vendor/document-template-manager";
import { getTranslations } from "next-intl/server";

export default async function DocumentTemplatesPage() {
  const t = await getTranslations("vendor.estimates");
  const { data: templates } = await getDocumentTemplates();

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <h1 className="text-3xl font-bold text-content-primary tracking-tight">
        {t("docTemplates.title")}
      </h1>
      <DocumentTemplateManager initialTemplates={templates} />
    </div>
  );
}
