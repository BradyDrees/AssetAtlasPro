"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import ExpenseCard from "./expense-card";
import ExpenseForm from "./expense-form";
import { updateExpense, deleteExpense } from "@/app/actions/vendor-expenses";
import type { VendorExpense, CreateExpenseInput } from "@/lib/vendor/expense-types";

interface ExpenseListProps {
  expenses: VendorExpense[];
}

export default function ExpenseList({ expenses }: ExpenseListProps) {
  const t = useTranslations("vendor.expenses");
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const editingExpense = editingId ? expenses.find((e) => e.id === editingId) : null;

  function handleEdit(data: CreateExpenseInput) {
    if (!editingId) return;
    setError(null);
    startTransition(async () => {
      const result = await updateExpense(editingId, data);
      if (result.error) {
        setError(result.error);
      } else {
        setEditingId(null);
        setError(null);
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!deletingId) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteExpense(deletingId);
      if (result.error) {
        setError(result.error);
      } else {
        setDeletingId(null);
        setError(null);
        router.refresh();
      }
    });
  }

  // Edit mode — show form pre-filled
  if (editingExpense) {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-content-primary">{t("editExpense")}</h2>
          <button
            onClick={() => { setEditingId(null); setError(null); }}
            className="p-1.5 rounded-lg hover:bg-surface-secondary text-content-tertiary"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {error && (
          <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
        <ExpenseForm
          initialData={{
            category: editingExpense.category,
            description: editingExpense.description,
            amount: editingExpense.amount,
            date: editingExpense.date,
            notes: editingExpense.notes ?? undefined,
            is_reimbursable: editingExpense.is_reimbursable,
            work_order_id: editingExpense.work_order_id ?? undefined,
          }}
          onSubmit={handleEdit}
          onCancel={() => { setEditingId(null); setError(null); }}
          loading={isPending}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {error && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      {/* Delete confirmation overlay */}
      {deletingId && (
        <div className="rounded-xl bg-surface-primary border border-red-500/20 p-4">
          <p className="text-sm text-content-primary mb-3">{t("deleteConfirm")}</p>
          <div className="flex gap-2">
            <button
              onClick={handleDelete}
              disabled={isPending}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              {isPending ? t("deleting") : t("delete")}
            </button>
            <button
              onClick={() => { setDeletingId(null); setError(null); }}
              className="px-3 py-1.5 text-xs font-medium rounded-lg bg-surface-secondary text-content-tertiary hover:bg-surface-tertiary transition-colors"
            >
              {t("form.cancel")}
            </button>
          </div>
        </div>
      )}

      {expenses.map((expense) => (
        <ExpenseCard
          key={expense.id}
          expense={expense}
          onEdit={(id) => setEditingId(id)}
          onDelete={(id) => setDeletingId(id)}
        />
      ))}
    </div>
  );
}
