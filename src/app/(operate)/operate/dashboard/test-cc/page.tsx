import { getLocale } from "next-intl/server";
import { CommandCenterTopBar } from "@/components/operate/command-center-top-bar";
import { CommandCenterShell } from "@/components/operate/command-center-shell";
import type { OperateDashboardData } from "@/app/actions/operate-dashboard";
import operateDashboardEn from "@/messages/en/operate-dashboard.json";
import operateDashboardEs from "@/messages/es/operate-dashboard.json";

// Mock data — no server action, no auth
const MOCK_DATA: OperateDashboardData = {
  properties: [],
  feed: [],
  dispatch: { techs: [], unscheduledToday: [], needsAssignment: [] },
  alertsCount: 0,
  todayStr: "2026-03-18",
};

export default async function TestCommandCenter() {
  const locale = await getLocale();
  const translations = locale === "es" ? operateDashboardEs : operateDashboardEn;

  return (
    <div className="-m-4 md:-m-6">
      <div className="px-4 md:px-6 pt-4 md:pt-6">
        <CommandCenterTopBar
          today={MOCK_DATA.todayStr}
          alertsCount={MOCK_DATA.alertsCount}
          locale={locale}
          translations={translations}
        />
      </div>

      <div className="px-4 md:px-6 py-4">
        <CommandCenterShell
          data={MOCK_DATA}
          userId=""
          locale={locale}
          translations={translations}
        />
      </div>
    </div>
  );
}
