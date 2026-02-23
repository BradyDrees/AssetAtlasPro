"use client";

import { useTranslations } from "next-intl";

interface ExpenseCategory {
  category: string;
  total: number;
}

interface DashboardExpensesWidgetProps {
  data: ExpenseCategory[];
}

function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function DashboardExpensesWidget({ data }: DashboardExpensesWidgetProps) {
  const t = useTranslations("vendor.dashboard");
  const maxTotal = data.length > 0 ? Math.max(...data.map((d) => d.total)) : 0;

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary p-5">
      <h3 className="text-lg font-semibold text-content-primary mb-4">{t("expenses.title")}</h3>
      {data.length === 0 ? (
        <p className="text-content-muted text-sm">{t("expenses.noData")}</p>
      ) : (
        <div className="space-y-3">
          {data.map((item) => {
            const widthPct = maxTotal > 0 ? Math.round((item.total / maxTotal) * 100) : 0;
            return (
              <div key={item.category}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm text-content-secondary">{item.category}</span>
                  <span className="text-sm font-medium text-content-primary">{formatUSD(item.total)}</span>
                </div>
                <div className="w-full h-2 bg-surface-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-500 rounded-full transition-all"
                    style={{ width: widthPct + "%" }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}