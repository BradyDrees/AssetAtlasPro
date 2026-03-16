"use client";

import { useTranslations } from "next-intl";
import { useFormatDate } from "@/hooks/use-format-date";
import { VendorExpense, EXPENSE_CATEGORY_COLORS } from "@/lib/vendor/expense-types";

interface ExpenseCardProps {
  expense: VendorExpense;
  onEdit?: (id: string) => void;
  onDelete?: (id: string) => void;
}

export default function ExpenseCard({ expense, onEdit, onDelete }: ExpenseCardProps) {
  const t = useTranslations("vendor.expenses");
  const { formatDate } = useFormatDate();
  const color = EXPENSE_CATEGORY_COLORS[expense.category] || "#6b7280";
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(expense.amount);
  const formattedDate = formatDate(expense.date, { weekday: false });

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <span
            className="mt-1 h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: color }}
          />
          <div className="min-w-0">
            <p className="text-sm font-medium text-content-primary truncate">
              {expense.description}
            </p>
            <p className="text-xs text-content-tertiary mt-0.5">
              {t("categories." + expense.category)} &middot; {formattedDate}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {expense.receipt_path && (
            <svg className="h-4 w-4 text-content-tertiary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 002.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 008.486 8.486L20.5 13" />
            </svg>
          )}
          {expense.is_reimbursable && (
            <span className="text-[10px] font-semibold uppercase tracking-wide bg-brand-500/10 text-brand-600 px-1.5 py-0.5 rounded">
              {t("reimbursable")}
            </span>
          )}
          <span className="text-sm font-semibold text-content-primary">{formattedAmount}</span>
        </div>
      </div>
      {(onEdit || onDelete) && (
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-edge-secondary">
          {onEdit && (
            <button
              onClick={() => onEdit(expense.id)}
              className="text-xs font-medium text-brand-600 hover:text-brand-700"
            >
              {t("edit")}
            </button>
          )}
          {onDelete && (
            <button
              onClick={() => onDelete(expense.id)}
              className="text-xs font-medium text-red-500 hover:text-red-600"
            >
              {t("delete")}
            </button>
          )}
        </div>
      )}
    </div>
  );
}