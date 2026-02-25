import { getTranslations } from "next-intl/server";

export default async function TermsPage() {
  const t = await getTranslations("legal");

  const sections = [
    { title: t("terms.acceptanceTitle"), body: t("terms.acceptanceBody") },
    { title: t("terms.descriptionTitle"), body: t("terms.descriptionBody") },
    { title: t("terms.accountsTitle"), body: t("terms.accountsBody") },
    { title: t("terms.useTitle"), body: t("terms.useBody") },
    { title: t("terms.ipTitle"), body: t("terms.ipBody") },
    { title: t("terms.dataTitle"), body: t("terms.dataBody") },
    { title: t("terms.disclaimerTitle"), body: t("terms.disclaimerBody") },
    { title: t("terms.limitationTitle"), body: t("terms.limitationBody") },
    { title: t("terms.terminationTitle"), body: t("terms.terminationBody") },
    { title: t("terms.changesTitle"), body: t("terms.changesBody") },
    { title: t("terms.contactTitle"), body: t("terms.contactBody") },
  ];

  return (
    <div>
      <h1 className="text-3xl md:text-4xl font-bold mb-2">
        {t("termsTitle")}
      </h1>
      <p className="text-sm text-slate-500 mb-10">
        {t("lastUpdated")}: February 24, 2026
      </p>

      <div className="space-y-8">
        {sections.map((section, i) => (
          <div key={i}>
            <h2 className="text-lg font-semibold text-white mb-2">
              {i + 1}. {section.title}
            </h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              {section.body}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
