import { getTranslations } from "next-intl/server";

export default async function PrivacyPage() {
  const t = await getTranslations("legal");

  const sections = [
    { title: t("privacy.collectTitle"), body: t("privacy.collectBody") },
    { title: t("privacy.useTitle"), body: t("privacy.useBody") },
    { title: t("privacy.storageTitle"), body: t("privacy.storageBody") },
    { title: t("privacy.sharingTitle"), body: t("privacy.sharingBody") },
    { title: t("privacy.cookiesTitle"), body: t("privacy.cookiesBody") },
    { title: t("privacy.rightsTitle"), body: t("privacy.rightsBody") },
    { title: t("privacy.childrenTitle"), body: t("privacy.childrenBody") },
    { title: t("privacy.changesTitle"), body: t("privacy.changesBody") },
    { title: t("privacy.contactTitle"), body: t("privacy.contactBody") },
  ];

  return (
    <div>
      <h1 className="text-3xl md:text-4xl font-bold mb-2">
        {t("privacyTitle")}
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
