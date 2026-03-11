import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getDashboardData, getSetupProgress, getHealthScore } from "@/app/actions/home-dashboard";
import { getSeasonalReminders } from "@/app/actions/home-property";
import { DashboardActiveWoList } from "@/components/home/dashboard-active-wo";
import { DashboardPropertyCard } from "@/components/home/dashboard-property-card";
import { DashboardUpcomingVisits } from "@/components/home/dashboard-upcoming";
import { DashboardActivity } from "@/components/home/dashboard-activity";
import { DashboardMaintenanceAlerts } from "@/components/home/dashboard-maintenance-alerts";
import { DashboardSetupChecklist } from "@/components/home/dashboard-setup-checklist";
import { HealthScoreCard } from "@/components/home/health-score-card";
import { SeasonalReminders } from "@/components/home/seasonal-reminders";

export default async function HomeDashboardPage() {
  const [t, ts, data, setupProgress, healthScore, seasonalReminders] = await Promise.all([
    getTranslations("home.dashboard"),
    getTranslations("home.setup"),
    getDashboardData(),
    getSetupProgress(),
    getHealthScore(),
    getSeasonalReminders(),
  ]);

  const showPoolExplainer =
    data.stats.poolBalance === 0 && !data.hasSubscription;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-content-primary">{t("title")}</h1>
        <p className="text-sm text-content-tertiary mt-1">{t("subtitle")}</p>
      </div>

      {/* Setup Checklist (hides when all 4 steps are complete) */}
      <DashboardSetupChecklist progress={setupProgress} />

      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-3">
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-4 text-center">
          <div className="flex justify-center mb-1.5">
            <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-content-primary">{data.stats.totalActive}</p>
          <p className="text-[10px] text-content-quaternary mt-0.5">{t("statsActive")}</p>
        </div>
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-4 text-center">
          <div className="flex justify-center mb-1.5">
            <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-content-primary">{data.stats.totalCompleted}</p>
          <p className="text-[10px] text-content-quaternary mt-0.5">{t("statsCompleted")}</p>
        </div>
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-4 text-center">
          <div className="flex justify-center mb-1.5">
            <svg className="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-content-primary">{data.stats.upcomingCount}</p>
          <p className="text-[10px] text-content-quaternary mt-0.5">{t("statsUpcoming")}</p>
        </div>

        {/* Pool balance card — show explainer or balance */}
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-4 text-center">
          <div className="flex justify-center mb-1.5">
            <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
            </svg>
          </div>
          <p className="text-2xl font-bold text-rose-400">${Number(data.stats.poolBalance).toFixed(0)}</p>
          <p className="text-[10px] text-content-quaternary mt-0.5">{t("poolBalance")}</p>
        </div>
      </div>

      {/* Pool explainer banner (shown below stats when no subscription) */}
      {showPoolExplainer && (
        <div className="bg-rose-500/5 border border-rose-500/15 rounded-xl p-4 flex items-start gap-3">
          <svg
            className="w-5 h-5 text-rose-400 flex-shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z"
            />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-rose-300 font-medium">{ts("poolExplainerTitle")}</p>
            <p className="text-xs text-content-quaternary mt-0.5">{ts("poolExplainerBody")}</p>
            <Link
              href="/home/subscription"
              className="text-xs text-rose-400 hover:text-rose-300 font-medium mt-1.5 inline-block"
            >
              {ts("setupFund")} →
            </Link>
          </div>
        </div>
      )}

      {/* Maintenance Alerts (client component — self-loading) */}
      <DashboardMaintenanceAlerts />

      {/* Health Score */}
      {healthScore && (
        <HealthScoreCard
          score={healthScore.overall}
          grade={healthScore.grade}
          confidence={healthScore.confidence}
        />
      )}

      {/* Seasonal Reminders */}
      <SeasonalReminders reminders={seasonalReminders} />

      {/* Quick Actions + Property */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Quick Actions */}
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-5">
          <h2 className="text-sm font-semibold text-content-primary mb-3">{t("quickActions")}</h2>
          <div className="space-y-2">
            <Link
              href="/home/work-orders/new"
              className="w-full flex items-center gap-3 px-4 py-3 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors text-sm font-semibold shadow-sm"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              {t("submitWorkOrder")}
            </Link>
            <Link
              href="/home/vendors"
              className="w-full flex items-center gap-3 px-4 py-3 border border-edge-primary text-content-secondary rounded-lg hover:bg-surface-secondary transition-colors text-sm font-medium"
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
