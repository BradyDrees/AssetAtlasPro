import { getTranslations } from "next-intl/server";
import { getDashboardData } from "@/app/actions/vendor-dashboard";
import type { DateRangePreset } from "@/app/actions/vendor-dashboard";
import { getCredentialSummary } from "@/app/actions/vendor-profile";
import { getVendorScorecardSelf } from "@/app/actions/vendor-scorecard";
import { getReviewAnalytics } from "@/app/actions/vendor-reviews";
import { getLowStockAlerts } from "@/app/actions/vendor-inventory";
import { getActionSummary } from "@/app/actions/vendor-actions";
import { DashboardShell } from "@/components/vendor/dashboard-shell";
import { DashboardStatsGrid } from "@/components/vendor/dashboard-stats";
import { IncomingWorkOrders } from "@/components/vendor/incoming-work-orders";
import { DashboardUpcomingJobs } from "@/components/vendor/dashboard-upcoming-jobs";
import { DashboardRevenueBalance } from "@/components/vendor/dashboard-revenue-balance";
import { DashboardExpensesWidget } from "@/components/vendor/dashboard-expenses-widget";
import { DashboardTechScoreboard } from "@/components/vendor/dashboard-tech-scoreboard";
import { DashboardReviewsWidget } from "@/components/vendor/dashboard-reviews-widget";
import { DashboardPerformanceWidget } from "@/components/vendor/dashboard-performance-widget";
import { DashboardInventoryWidget } from "@/components/vendor/dashboard-inventory-widget";
import { DashboardLeadSources } from "@/components/vendor/dashboard-lead-sources";
import { DashboardActionsWidget } from "@/components/vendor/dashboard-actions-widget";
import Link from "next/link";

const VALID_RANGES = new Set<DateRangePreset>(["today", "week", "month", "quarter"]);

function normalizeRange(value?: string): DateRangePreset {
  if (value && VALID_RANGES.has(value as DateRangePreset)) {
    return value as DateRangePreset;
  }
  return "month";
}

interface ProDashboardPageProps {
  searchParams?: Promise<{ range?: string }>;
}

export default async function ProDashboardPage({
  searchParams,
}: ProDashboardPageProps) {
  const resolvedParams = await searchParams;
  const range = normalizeRange(resolvedParams?.range);
  const dt = await getTranslations("vendor.dashboard");

  const [dashData, credSummary, reviewAnalytics, scorecardResult, lowStockResult, actionSummary] = await Promise.all([
    getDashboardData(range),
    getCredentialSummary(),
    getReviewAnalytics(),
    getVendorScorecardSelf(),
    getLowStockAlerts(),
    getActionSummary().catch(() => ({ totalCount: 0, criticalCount: 0, highCount: 0, categories: [], topItems: [] })),
  ]);

  const { stats, incoming, upcomingJobs, revenueBalance, expensesSummary, techScoreboard } = dashData;

  // Determine setup completion
  const setupItems = [
    { done: true, label: dt("quickSetup.completeProfile"), href: "/pro/profile" },
    { done: credSummary.total > 0, label: dt("quickSetup.addCredentials"), href: "/pro/profile/credentials" },
    { done: false, label: dt("quickSetup.connectPm"), href: "/pro/clients" },
  ];

  const allSetup = setupItems.every((i) => i.done);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Welcome header */}
      <div>
        <h1 className="text-2xl font-bold text-content-primary">
          {dt("welcomeDefault")}
        </h1>
        {!allSetup && (
          <p className="text-content-tertiary mt-1">{dt("setupPrompt")}</p>
        )}
      </div>

      <DashboardShell range={range}>
        {/* Stats */}
        <DashboardStatsGrid stats={stats} />

        {/* Action Items */}
        {actionSummary.totalCount > 0 && (
          <DashboardActionsWidget summary={actionSummary} />
        )}

        {/* Revenue Balance */}
        <DashboardRevenueBalance
          outstanding={revenueBalance.outstanding}
          received={revenueBalance.received}
          pastDue={revenueBalance.pastDue}
        />

        {/* Quick Setup (show only if not all complete) */}
        {!allSetup && (
          <div className="bg-surface-primary rounded-xl border border-edge-primary p-6">
            <h2 className="text-lg font-semibold text-content-primary mb-4">
              {dt("quickSetup.title")}
            </h2>
            <div className="space-y-3">
              {setupItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="flex items-center gap-3 p-3 rounded-lg border border-edge-secondary hover:bg-surface-secondary transition-colors"
                >
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
                      item.done ? "border-brand-500 bg-brand-500" : "border-content-quaternary"
                    }`}
                  >
                    {item.done && (
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                  </div>
                  <span className={`text-sm ${item.done ? "text-content-tertiary line-through" : "text-content-primary"}`}>
                    {item.label}
                  </span>
                  <svg className="w-4 h-4 text-content-quaternary ml-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Main widgets grid */}
        <div className="grid lg:grid-cols-2 gap-6">
          <IncomingWorkOrders orders={incoming} />
          <DashboardUpcomingJobs jobs={upcomingJobs} />
        </div>

        {/* Bottom widgets */}
        <div className="grid lg:grid-cols-2 gap-6">
          <DashboardExpensesWidget data={expensesSummary} />
          <DashboardTechScoreboard scores={techScoreboard} />
        </div>

        {/* Lead Sources */}
        <DashboardLeadSources />

        {/* Reviews widget */}
        {reviewAnalytics.data && (
          <DashboardReviewsWidget analytics={reviewAnalytics.data} />
        )}

        {/* Your Performance widget */}
        {scorecardResult.data && (
          <DashboardPerformanceWidget data={scorecardResult.data} />
        )}

        {/* Low Stock Alerts */}
        <DashboardInventoryWidget alerts={lowStockResult.data} />

        {/* Bottom section links */}
        <div className="grid lg:grid-cols-2 gap-6">
          <Link
            href="/pro/estimates"
            className="bg-surface-primary rounded-xl border border-edge-primary p-5 hover:border-edge-secondary transition-colors group"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-content-primary">
                {dt("sections.pendingEstimates")}
              </h2>
              <span className="text-2xl font-bold text-content-primary">{stats.pendingEstimates}</span>
            </div>
            <p className="text-xs text-content-tertiary mt-1">{dt("actions.viewAll")}</p>
          </Link>
          <Link
            href="/pro/clients"
            className="bg-surface-primary rounded-xl border border-edge-primary p-5 hover:border-edge-secondary transition-colors group"
          >
            <div className="flex items-center justify-between">
              <h2 className="text-base font-semibold text-content-primary">
                {dt("sections.pmClients")}
              </h2>
              <svg className="w-5 h-5 text-content-quaternary group-hover:text-content-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </div>
            <p className="text-xs text-content-tertiary mt-1">{dt("actions.connectWithPm")}</p>
          </Link>
        </div>
      </DashboardShell>
    </div>
  );
}
