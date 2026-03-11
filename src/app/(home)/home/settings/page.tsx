"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { useTheme } from "@/components/theme-provider";
import { useAppLocale } from "@/components/locale-provider";

export default function HomeSettingsPage() {
  const t = useTranslations("home.settings");
  const { theme, toggleTheme } = useTheme();
  const { locale, toggleLocale } = useAppLocale();

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-content-primary">{t("settings")}</h1>
        <p className="text-sm text-content-tertiary mt-1">{t("settingsDesc")}</p>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Link
          href="/home/settings/subscription"
          className="bg-surface-primary border border-edge-primary rounded-xl p-5 hover:border-rose-500/30 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-content-primary group-hover:text-rose-500 transition-colors">
                {t("subscription")}
              </p>
              <p className="text-xs text-content-tertiary">{t("subscriptionLink")}</p>
            </div>
          </div>
        </Link>
        <Link
          href="/home/settings/matching"
          className="bg-surface-primary border border-edge-primary rounded-xl p-5 hover:border-rose-500/30 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center">
              <svg className="w-5 h-5 text-rose-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-content-primary group-hover:text-rose-500 transition-colors">
                {t("matching")}
              </p>
              <p className="text-xs text-content-tertiary">{t("matchingLink")}</p>
            </div>
          </div>
        </Link>
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
        <h2 className="text-lg font-semibold text-content-primary mb-4">{t("theme")}</h2>
        <div className="flex gap-3">
          <button
            onClick={() => { if (theme === "dark") toggleTheme(); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              theme === "light"
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                : "bg-surface-secondary text-content-tertiary hover:text-content-primary"
            }`}
          >
            {t("light")}
          </button>
          <button
            onClick={() => { if (theme === "light") toggleTheme(); }}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              theme === "dark"
                ? "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                : "bg-surface-secondary text-content-tertiary hover:text-content-primary"
            }`}
          >
            {t("dark")}
          </button>
        </div>
      </div>

      {/* Notification Preferences (placeholder) */}
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-6">
        <h2 className="text-lg font-semibold text-content-primary mb-4">{t("notifications")}</h2>
        <div className="space-y-4">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm text-content-secondary block">{t("emailNotifications")}</span>
              <span className="text-xs text-content-quaternary">{t("emailNotificationsDesc")}</span>
            </div>
            <div className="relative flex-shrink-0 ml-4">
              <input type="checkbox" className="sr-only peer" defaultChecked />
              <div className="w-10 h-5 bg-charcoal-600 rounded-full peer-checked:bg-rose-500 transition-colors" />
              <div className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition-transform" />
            </div>
          </label>
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <span className="text-sm text-content-secondary block">{t("smsNotifications")}</span>
              <span className="text-xs text-content-quaternary">{t("smsNotificationsDesc")}</span>
            </div>
            <div className="relative flex-shrink-0 ml-4">
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
