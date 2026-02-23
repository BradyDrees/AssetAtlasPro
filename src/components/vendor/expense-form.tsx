"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { CreateExpenseInput } from "@/lib/vendor/expense-types";
import { EXPENSE_CATEGORIES } from "@/lib/vendor/expense-types";
import type { ExpenseCategory } from "@/lib/vendor/types";

interface ExpenseFormProps {
  initialData?: Partial<CreateExpenseInput>;
  workOrders?: { id: string; description: string | null }[];
  onSubmit: (data: CreateExpenseInput) => void;
  onCancel: () => void;
  loading?: boolean;
}

export default function ExpenseForm({
  initialData,
  workOrders,
  onSubmit,
  onCancel,
  loading = false,
}: ExpenseFormProps) {
  const t = useTranslations("vendor.expenses");
  const today = new Date().toISOString().split("T")[0];

  const [category, setCategory] = useState<ExpenseCategory>(initialData?.category || "supplies");
  const [description, setDescription] = useState(initialData?.description || "");
  const [amount, setAmount] = useState(initialData?.amount?.toString() || "");
  const [date, setDate] = useState(initialData?.date || today);
  const [notes, setNotes] = useState(initialData?.notes || "");
  const [isReimbursable, setIsReimbursable] = useState(initialData?.is_reimbursable || false);
  const [workOrderId, setWorkOrderId] = useState(initialData?.work_order_id || "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    onSubmit({
      category,
      description,
      amount: parseFloat(amount) || 0,
      date,
      notes: notes || undefined,
      is_reimbursable: isReimbursable,
      work_order_id: workOrderId || undefined,
    });
  }

  const inputClass = "w-full rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-sm text-content-primary placeholder:text-content-muted focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";
  const labelClass = "block text-sm font-medium text-content-secondary mb-1";

  return (
    <form onSubmit={handleSubmit} className="bg-surface-primary rounded-xl border border-edge-primary p-5 space-y-4">
      {/* Category */}
      <div>
        <label className={labelClass}>{t("field.category")}</label>
        <select value={category} onChange={(e) => setCategory(e.target.value as ExpenseCategory)} className={inputClass}>
          {EXPENSE_CATEGORIES.map((cat: ExpenseCategory) => (
            <option key={cat} value={cat}>{t("category." + cat)}</option>
          ))}
        </select>
      </div>

      {/* Description */}
      <div>
        <label className={labelClass}>{t("field.description")}</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          placeholder={t("placeholder.description")}
          className={inputClass}
        />
      </div>

      {/* Amount */}
      <div>
        <label className={labelClass}>{t("field.amount")}</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          placeholder="0.00"
          className={inputClass}
        />
      </div>

      {/* Date */}
      <div>
        <label className={labelClass}>{t("field.date")}</label>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          required
          className={inputClass}
        />
      </div>

      {/* Notes */}
      <div>
        <label className={labelClass}>{t("field.notes")}</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder={t("placeholder.notes")}
          className={inputClass}
        />
      </div>

      {/* Work Order */}
      {workOrders && workOrders.length > 0 && (
        <div>
          <label className={labelClass}>{t("field.workOrder")}</label>
          <select value={workOrderId} onChange={(e) => setWorkOrderId(e.target.value)} className={inputClass}>
            <option value="">{t("field.noWorkOrder")}</option>
            {workOrders.map((wo) => (
              <option key={wo.id} value={wo.id}>{wo.description || wo.id}</option>
            ))}
          </select>
        </div>
      )}

      {/* Reimbursable */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={isReimbursable}
          onChange={(e) => setIsReimbursable(e.target.checked)}
          className="h-4 w-4 rounded border-edge-primary text-brand-600 focus:ring-brand-500"
        />
        <span className="text-sm text-content-secondary">{t("field.reimbursable")}</span>
      </label>

      {/* Actions */}
      <div className="flex items-center gap-3 pt-2">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
        >
          {loading ? t("saving") : t("save")}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 rounded-lg border border-edge-primary px-4 py-2.5 text-sm font-semibold text-content-secondary hover:bg-surface-secondary transition-colors"
        >
          {t("cancel")}
        </button>
      </div>
    </form>
  );
}