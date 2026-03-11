import { getTranslations } from "next-intl/server";
import { EmergencyContent } from "./emergency-content";

export default async function EmergencyPage() {
  const t = await getTranslations("home.emergency");

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div className="text-center">
        <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-4">
          <svg
            className="w-8 h-8 text-red-500"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-content-primary">
          {t("title")}
        </h1>
        <p className="text-sm text-content-tertiary mt-1">{t("subtitle")}</p>
      </div>
      <EmergencyContent />
    </div>
  );
}
