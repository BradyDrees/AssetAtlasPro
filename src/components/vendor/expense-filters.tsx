"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { EXPENSE_CATEGORIES } from "@/lib/vendor/expense-types";
import type { ExpenseCategory } from "@/lib/vendor/types";

interface ExpenseFiltersProps {
  onFilterChange: (filters: { dateFrom?: string; dateTo?: string; category?: string }) => void;
}

export default function ExpenseFilters({ onFilterChange }: ExpenseFiltersProps) {
  const t = useTranslations("vendor.expenses");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [category, setCategory] = useState("");

  function update(patch: { dateFrom?: string; dateTo?: string; category?: string }) {
    const next = { dateFrom, dateTo, category, ...patch };
    setDateFrom(next.dateFrom);
    setDateTo(next.dateTo);
    setCategory(next.category);
    onFilterChange({
      dateFrom: next.dateFrom || undefined,
      dateTo: next.dateTo || undefined,
      category: next.category || undefined,
    });
  }

  const inputClass = "rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-sm text-content-primary focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <div>
        <label className="block text-xs font-medium text-content-tertiary mb-1">{t("filter.from")}</label>
        <input type="date" value={dateFrom} onChange={(e) => update({ dateFrom: e.target.value })} className={inputClass} />
      </div>
      <div>
        <label className="block text-xs font-medium text-content-tertiary mb-1">{t("filter.to")}</label>
        <input type="date" value={dateTo} onChange={(e) => update({ dateTo: e.target.value })} className={inputClass} />
      </div>
      <div>
        <label className="block text-xs font-medium text-content-tertiary mb-1">{t("filter.category")}</label>
        <select value={category} onChange={(e) => update({ category: e.target.value })} className={inputClass}>
          <option value="">{t("filter.allCategories")}</option>
          {EXPENSE_CATEGORIES.map((cat: ExpenseCategory) => (
            <option key={cat} value={cat}>{t("category." + cat)}</option>
          ))}
        </select>
      </div>
    </div>
  );
}