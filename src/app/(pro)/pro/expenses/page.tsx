import { getTranslations } from "next-intl/server";
import Link from "next/link";
import { getVendorExpenses, getExpenseSummary } from "@/app/actions/vendor-expenses";
import ExpenseList from "@/components/vendor/expense-list";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

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
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          <Link
            href="/pro/expenses/new"
            className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700 transition-colors"
          >
            {t("addExpense")}
          </Link>
        }
      />

      {/* Summary */}
      {summary && summary.length > 0 && (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
          <h2 className="text-sm font-semibold text-content-secondary mb-3">{t("summary.title")}</h2>
          <ul className="space-y-2">
            {summary.map((item) => (
              <li key={item.category} className="flex items-center justify-between text-sm">
                <span className="text-content-secondary">{t("categories." + item.category)}</span>
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
        <EmptyState icon="receipt" title={t("empty")} subtitle={t("emptySubtitle")} action={{ label: t("addExpense"), href: "/pro/expenses/new" }} />
      ) : (
        <ExpenseList expenses={expenses} />
      )}
    </div>
  );
}
