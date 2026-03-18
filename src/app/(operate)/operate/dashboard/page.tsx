import { createClient } from "@/lib/supabase/server";
import { getLocale } from "next-intl/server";
import { getOperateDashboard } from "@/app/actions/operate-dashboard";
import { CommandCenterTopBar } from "@/components/operate/command-center-top-bar";
import { CommandCenterShell } from "@/components/operate/command-center-shell";
import type { OperateDashboardData } from "@/app/actions/operate-dashboard";
import operateDashboardEn from "@/messages/en/operate-dashboard.json";
import operateDashboardEs from "@/messages/es/operate-dashboard.json";

const EMPTY_DATA: OperateDashboardData = {
  properties: [],
  feed: [],
  dispatch: { techs: [], unscheduledToday: [], needsAssignment: [] },
  alertsCount: 0,
  todayStr: new Date().toISOString().slice(0, 10),
};

export default async function OperateDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const locale = await getLocale();
  const translations = locale === "es" ? operateDashboardEs : operateDashboardEn;

  // Fetch dashboard data with fallback to empty on error
  let data: OperateDashboardData;
  try {
    data = await getOperateDashboard();
  } catch {
    data = EMPTY_DATA;
  }

  return (
    <div className="-m-4 md:-m-6">
      <div className="px-4 md:px-6 pt-4 md:pt-6">
        <CommandCenterTopBar
          today={data.todayStr}
          alertsCount={data.alertsCount}
          locale={locale}
          translations={translations}
        />
      </div>

      <div className="px-4 md:px-6 py-4">
        <CommandCenterShell
          data={data}
          userId={user?.id ?? ""}
          locale={locale}
          translations={translations}
        />
      </div>
    </div>
  );
}
