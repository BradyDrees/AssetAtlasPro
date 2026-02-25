"use client";

import { useTranslations } from "next-intl";
import { useTheme } from "@/components/theme-provider";
import { useAppLocale } from "@/components/locale-provider";

export default function HomeSettingsPage() {
  const t = useTranslations("home.property");
  const { theme, toggleTheme } = useTheme();
  const { locale, toggleLocale } = useAppLocale();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-content-primary">{t("settings")}</h1>
        <p className="text-sm text-content-tertiary mt-1">{t("settingsDesc")}</p>
      </div>

      {/* Language */}
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-6">
        <h2 className="text-lg font-semibold text-content-primary mb-4">{t("language")}</h2>
        <div className="flex gap-3">
          <button
            onClick={() => { if (locale === "es") toggleLocale(); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              locale === "en"
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                : "bg-surface-secondary text-content-tertiary hover:text-content-primary"
            }`}
          >
            {t("english")}
          </button>
          <button
            onClick={() => { if (locale === "en") toggleLocale(); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              locale === "es"
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                : "bg-surface-secondary text-content-tertiary hover:text-content-primary"
            }`}
          >
            {t("spanish")}
          </button>
        </div>
      </div>

      {/* Theme */}
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-6">
        <h2 className="text-lg font-semibold text-content-primary mb-4">Theme</h2>
        <div className="flex gap-3">
          <button
            onClick={() => { if (theme === "dark") toggleTheme(); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              theme === "light"
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                : "bg-surface-secondary text-content-tertiary hover:text-content-primary"
            }`}
          >
            Light
          </button>
          <button
            onClick={() => { if (theme === "light") toggleTheme(); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              theme === "dark"
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                : "bg-surface-secondary text-content-tertiary hover:text-content-primary"
            }`}
          >
            Dark
          </button>
        </div>
      </div>

      {/* Notification Preferences (placeholder) */}
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-6">
        <h2 className="text-lg font-semibold text-content-primary mb-4">{t("notifications")}</h2>
        <div className="space-y-3">
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-content-secondary">{t("emailNotifications")}</span>
            <div className="relative">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-10 h-5 bg-charcoal-600 rounded-full peer-checked:bg-rose-500 transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition-transform" />
            </div>
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <span className="text-sm text-content-secondary">{t("smsNotifications")}</span>
            <div className="relative">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-10 h-5 bg-charcoal-600 rounded-full peer-checked:bg-rose-500 transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition-transform" />
            </div>
          </label>
        </div>
      </div>
    </div>
  );
}
