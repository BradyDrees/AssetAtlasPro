import { getTranslations } from "next-intl/server";
import { getDocuments } from "@/app/actions/home-documents";
import { DocumentVaultContent } from "./documents-content";
import { PageHeader } from "@/components/ui/page-header";

export default async function DocumentsPage() {
  const t = await getTranslations("home.documents");
  const { documents, expiringSoon } = await getDocuments();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader title={t("title")} subtitle={t("subtitle")} />
      <DocumentVaultContent
        initialDocuments={documents}
        initialExpiring={expiringSoon}
      />
    </div>
  );
}
