import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getDashboardData } from "@/app/actions/home-dashboard";
import { DashboardActiveWoList } from "@/components/home/dashboard-active-wo";
import { DashboardPropertyCard } from "@/components/home/dashboard-property-card";
import { DashboardUpcomingVisits } from "@/components/home/dashboard-upcoming";
import { DashboardActivity } from "@/components/home/dashboard-activity";

export default async function HomeDashboardPage() {
  const t = await getTranslations("home.dashboard");
  const data = await getDashboardData();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-content-primary">{t("title")}</h1>
        <p className="text-sm text-content-tertiary mt-1">{t("subtitle")}</p>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-4 text-center">
          <p className="text-2xl font-bold text-content-primary">{data.stats.totalActive}</p>
          <p className="text-[10px] text-content-quaternary mt-0.5">{t("statsActive")}</p>
        </div>
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-4 text-center">
          <p className="text-2xl font-bold text-content-primary">{data.stats.totalCompleted}</p>
          <p className="text-[10px] text-content-quaternary mt-0.5">{t("statsCompleted")}</p>
        </div>
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-4 text-center">
          <p className="text-2xl font-bold text-content-primary">{data.stats.upcomingCount}</p>
          <p className="text-[10px] text-content-quaternary mt-0.5">{t("statsUpcoming")}</p>
        </div>
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-4 text-center">
          <p className="text-2xl font-bold text-rose-400">${Number(data.stats.poolBalance).toFixed(0)}</p>
          <p className="text-[10px] text-content-quaternary mt-0.5">{t("poolBalance")}</p>
        </div>
      </div>

      {/* Quick Actions + Property */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quick Actions */}
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-5">
          <h2 className="text-sm font-semibold text-content-primary mb-3">{t("quickActions")}</h2>
          <div className="space-y-2">
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

        {/* Your Property */}
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-content-primary">{t("yourProperty")}</h2>
            <Link href="/home/property" className="text-xs text-rose-500 hover:text-rose-400 font-medium">
              {t("viewProperty")}
            </Link>
          </div>
          <DashboardPropertyCard property={data.property} />
        </div>
      </div>

      {/* Active Work Orders + Upcoming */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Active Work Orders */}
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-content-primary">{t("activeWorkOrders")}</h2>
            <Link href="/home/work-orders" className="text-xs text-rose-500 hover:text-rose-400 font-medium">
              {t("viewAll")}
            </Link>
          </div>
          <DashboardActiveWoList wos={data.activeWos} />
        </div>

        {/* Upcoming Visits */}
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-5">
          <h2 className="text-sm font-semibold text-content-primary mb-3">{t("upcomingVisits")}</h2>
          <DashboardUpcomingVisits visits={data.upcoming} />
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-5">
        <h2 className="text-sm font-semibold text-content-primary mb-3">{t("recentActivity")}</h2>
        <DashboardActivity events={data.activity} />
      </div>
    </div>
  );
}
