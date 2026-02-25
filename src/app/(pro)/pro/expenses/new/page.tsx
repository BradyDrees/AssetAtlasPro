import { getTranslations } from "next-intl/server";
import Link from "next/link";
import ExpenseFormClient from "@/components/vendor/expense-form-client";

export default async function NewExpensePage() {
  const t = await getTranslations("vendor.expenses");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/pro/expenses"
          className="flex h-9 w-9 items-center justify-center rounded-lg border border-edge-primary text-content-secondary hover:bg-surface-secondary transition-colors"
        >
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-xl font-bold text-content-primary">{t("addExpense")}</h1>
      </div>

      {/* Form */}
      <ExpenseFormClient />
    </div>
  );
}