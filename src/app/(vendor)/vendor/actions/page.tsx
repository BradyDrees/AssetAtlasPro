import { getTranslations } from "next-intl/server";
import { getActionItems, getCompletionHistory } from "@/app/actions/vendor-actions";
import { ActionList } from "@/components/vendor/action-list";

export default async function ActionsPage() {
  const t = await getTranslations("vendor.actions");

  // Parallel: action items + 7-day history
  const [actionData, historyData] = await Promise.all([
    getActionItems().catch(() => ({
      items: [],
      completedToday: [],
    })),
    getCompletionHistory(7).catch(() => ({ daily: [] })),
  ]);

  const { items, completedToday } = actionData;
  const { daily } = historyData;

  // Weekly totals
  const weeklyCompleted = daily.reduce((sum, d) => sum + d.completed, 0);
  const weeklyDismissed = daily.reduce((sum, d) => sum + d.dismissed, 0);
  const weeklySnoozed = daily.reduce((sum, d) => sum + d.snoozed, 0);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-content-primary">
          {t("pageTitle")}
        </h1>
        <p className="text-content-tertiary text-sm mt-1">
          {t("pageSubtitle")}
        </p>
      </div>

      {/* Weekly productivity stats */}
      {(weeklyCompleted > 0 || weeklyDismissed > 0 || weeklySnoozed > 0) && (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
          <h3 className="text-xs font-semibold text-content-tertiary uppercase tracking-wider mb-3">
            {t("productivity.title")}
          </h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-xl font-bold text-brand-400">{weeklyCompleted}</p>
              <p className="text-xs text-content-tertiary">{t("productivity.completed")}</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-content-secondary">{weeklyDismissed}</p>
              <p className="text-xs text-content-tertiary">{t("productivity.dismissed")}</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-bold text-amber-400">{weeklySnoozed}</p>
              <p className="text-xs text-content-tertiary">{t("productivity.snoozed")}</p>
            </div>
          </div>
        </div>
      )}

      {/* Action list */}
      <ActionList items={items} completedToday={completedToday} />
    </div>
  );
}
