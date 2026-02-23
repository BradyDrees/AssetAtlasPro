import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { getVendorExpenses, getExpenseSummary } from "@/app/actions/vendor-expenses";
import ExpenseCard from "@/components/vendor/expense-card";

export default async function ExpensesPage() {
  const t = await getTranslations("vendor.expenses");
  const [expensesResult, summaryResult] = await Promise.all([
    getVendorExpenses(),
    getExpenseSummary(),
  ]);

  const expenses = expensesResult.data;
  const summary = summaryResult.data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-content-primary">{t("title")}</h1>
        <Link
          href="/vendor/expenses/new"
          className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
        >
          {t("addExpense")}
        </Link>
      </div>

      {/* Summary */}
      {summary && summary.length > 0 && (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
          <h2 className="text-sm font-semibold text-content-secondary mb-3">{t("summary")}</h2>
          <ul className="space-y-2">
            {summary.map((item) => (
              <li key={item.category} className="flex items-center justify-between text-sm">
                <span className="text-content-secondary">{t("category." + item.category)}</span>
                <span className="font-medium text-content-primary">
                  {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(item.total)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Expense List */}
      {expenses.length === 0 ? (
        <p className="text-center text-sm text-content-muted py-12">{t("empty")}</p>
      ) : (
        <div className="space-y-3">
          {expenses.map((expense) => (
            <ExpenseCard key={expense.id} expense={expense} />
          ))}
        </div>
      )}
    </div>
  );
}
