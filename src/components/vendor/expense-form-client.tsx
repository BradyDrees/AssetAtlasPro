"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import ExpenseForm from "@/components/vendor/expense-form";
import { createExpense } from "@/app/actions/vendor-expenses";
import { CreateExpenseInput } from "@/lib/vendor/expense-types";

export default function ExpenseFormClient() {
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations("vendor.expenses");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Determine base path from current URL (/pro/expenses/new → /pro/expenses, /vendor/expenses/new → /vendor/expenses)
  const basePath = pathname.includes("/pro/") ? "/pro/expenses" : "/vendor/expenses";

  async function handleSubmit(data: CreateExpenseInput) {
    setLoading(true);
    setError(null);
    try {
      const result = await createExpense(data);
      if (result.error) {
        setError(result.error);
        setLoading(false);
        return;
      }
      router.push(basePath);
    } catch {
      setError(t("form.saveError"));
      setLoading(false);
    }
  }

  function handleCancel() {
    router.push(basePath);
  }

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
      <ExpenseForm
        onSubmit={handleSubmit}
        onCancel={handleCancel}
        loading={loading}
      />
    </div>
  );
}
