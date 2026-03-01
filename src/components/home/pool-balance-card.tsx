"use client";

import { useTranslations } from "next-intl";

interface PoolBalanceCardProps {
  balance: number;
  totalDeposited: number;
  totalSpent: number;
  transactions: Array<{
    id: string;
    type: string;
    amount: number;
    description: string | null;
    created_at: string;
  }>;
}

export function PoolBalanceCard({
  balance,
  totalDeposited,
  totalSpent,
  transactions,
}: PoolBalanceCardProps) {
  const t = useTranslations("home.subscription");

  return (
    <div className="bg-surface-primary border border-edge-primary rounded-xl p-5">
      <h3 className="text-lg font-semibold text-content-primary mb-4">
        {t("maintenancePool")}
      </h3>

      {/* Balance display */}
      <div className="text-center mb-5">
        <p className="text-3xl font-bold text-rose-500">
          ${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
        </p>
        <p className="text-xs text-content-tertiary mt-1">
          {t("currentBalance")}
        </p>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 mb-5">
        <div className="text-center p-3 bg-surface-secondary rounded-lg">
          <p className="text-sm font-semibold text-green-500">
            +${totalDeposited.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-content-quaternary">{t("totalDeposited")}</p>
        </div>
        <div className="text-center p-3 bg-surface-secondary rounded-lg">
          <p className="text-sm font-semibold text-red-400">
            -${totalSpent.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-content-quaternary">{t("totalSpent")}</p>
        </div>
      </div>

      {/* Recent transactions */}
      {transactions.length > 0 && (
        <div>
          <h4 className="text-sm font-medium text-content-secondary mb-2">
            {t("recentTransactions")}
          </h4>
          <div className="space-y-2 max-h-48 overflow-y-auto">
            {transactions.slice(0, 10).map((tx) => (
              <div
                key={tx.id}
                className="flex items-center justify-between text-sm py-1.5 border-b border-edge-secondary last:border-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-content-secondary truncate">
                    {tx.description ?? tx.type}
                  </p>
                  <p className="text-xs text-content-quaternary">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span
                  className={`font-medium ml-3 ${
                    tx.type === "deposit"
                      ? "text-green-500"
                      : tx.type === "refund"
                        ? "text-blue-400"
                        : "text-red-400"
                  }`}
                >
                  {tx.type === "deposit" || tx.type === "refund" ? "+" : "-"}$
                  {tx.amount.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
