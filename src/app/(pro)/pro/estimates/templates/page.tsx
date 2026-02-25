import { getDocumentTemplates } from "@/app/actions/vendor-document-templates";
import { DocumentTemplateManager } from "@/components/vendor/document-template-manager";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function DocumentTemplatesPage() {
  const t = await getTranslations("vendor.estimates");
  const { data: templates } = await getDocumentTemplates();

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/pro/estimates" className="p-1.5 rounded-lg hover:bg-surface-secondary text-content-tertiary">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-content-primary">{t("docTemplates.title")}</h1>
      </div>
      <DocumentTemplateManager initialTemplates={templates} />
    </div>
  );
}
