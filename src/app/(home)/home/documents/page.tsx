import { getTranslations } from "next-intl/server";
import { getDocuments } from "@/app/actions/home-documents";
import { DocumentVaultContent } from "./documents-content";

export default async function DocumentsPage() {
  const t = await getTranslations("home.documents");
  const { documents, expiringSoon } = await getDocuments();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-content-primary">{t("title")}</h1>
        <p className="text-sm text-content-tertiary mt-1">{t("subtitle")}</p>
      </div>
      <DocumentVaultContent
        initialDocuments={documents}
        initialExpiring={expiringSoon}
      />
    </div>
  );
}
