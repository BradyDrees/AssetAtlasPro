"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";

export default function HomeDashboardPage() {
  const t = useTranslations("home.dashboard");

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-content-primary">{t("title")}</h1>
        <p className="text-sm text-content-tertiary mt-1">{t("subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quick Actions */}
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-6">
          <h2 className="text-lg font-semibold text-content-primary mb-4">{t("quickActions")}</h2>
          <div className="space-y-3">
            <Link
              href="/home/work-orders/new"
              className="w-full flex items-center gap-3 px-4 py-3 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/20 transition-colors text-sm font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {t("submitWorkOrder")}
            </Link>
            <Link
              href="/home/vendors"
              className="w-full flex items-center gap-3 px-4 py-3 bg-surface-secondary text-content-secondary rounded-lg hover:bg-surface-tertiary transition-colors text-sm font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
              {t("browseVendors")}
            </Link>
          </div>
        </div>

        {/* Maintenance Pool (mock/placeholder) */}
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-6">
          <h2 className="text-lg font-semibold text-content-primary mb-4">{t("maintenancePool")}</h2>
          <div className="text-center py-4">
            <p className="text-3xl font-bold text-content-primary mb-1">$0.00</p>
            <p className="text-xs text-content-quaternary mb-4">{t("poolBalance")}</p>
            <p className="text-sm text-content-tertiary bg-surface-secondary rounded-lg px-4 py-3">
              {t("setupSubscription")}
            </p>
          </div>
        </div>

        {/* Active Work Orders */}
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-content-primary">{t("activeWorkOrders")}</h2>
            <Link href="/home/work-orders" className="text-xs text-rose-500 hover:text-rose-400 font-medium">
              {t("viewAll")}
            </Link>
          </div>
          <div className="text-center py-8 text-content-quaternary">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />
            </svg>
            <p className="text-sm">{t("noActiveWorkOrders")}</p>
          </div>
        </div>

        {/* Property Card */}
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-content-primary">{t("yourProperty")}</h2>
            <Link href="/home/property" className="text-xs text-rose-500 hover:text-rose-400 font-medium">
              {t("viewProperty")}
            </Link>
          </div>
          <div className="text-center py-8 text-content-quaternary">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" />
            </svg>
            <p className="text-sm">{t("propertyInfoPlaceholder")}</p>
          </div>
        </div>

        {/* Upcoming Visits */}
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-6">
          <h2 className="text-lg font-semibold text-content-primary mb-4">{t("upcomingVisits")}</h2>
          <div className="text-center py-8 text-content-quaternary">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            <p className="text-sm">{t("noUpcomingVisits")}</p>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-6">
          <h2 className="text-lg font-semibold text-content-primary mb-4">{t("recentActivity")}</h2>
          <div className="text-center py-8 text-content-quaternary">
            <svg className="w-12 h-12 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm">{t("noRecentActivity")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
