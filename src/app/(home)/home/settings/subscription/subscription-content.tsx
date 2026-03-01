"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { SUBSCRIPTION_PLANS, type SubscriptionPlanKey } from "@/lib/subscription-plans";
import { createSubscription, cancelSubscription, pauseSubscription, resumeSubscription } from "@/app/actions/home-subscriptions";
import { PoolBalanceCard } from "@/components/home/pool-balance-card";

interface Property {
  id: string;
  name: string;
  address: string | null;
}

interface Subscription {
  id: string;
  property_id: string;
  plan: string;
  status: string;
  monthly_amount: number;
  pool_deposit_amount: number;
  current_period_end: string | null;
}

interface Pool {
  id: string;
  property_id: string;
  balance: number;
  total_deposited: number;
  total_spent: number;
}

interface Transaction {
  id: string;
  pool_id: string;
  type: string;
  amount: number;
  description: string | null;
  created_at: string;
}

interface SubscriptionContentProps {
  properties: Property[];
  subscriptions: Subscription[];
  pools: Pool[];
  transactions: Transaction[];
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700",
  paused: "bg-amber-100 text-amber-700",
  cancelled: "bg-red-100 text-red-700",
  past_due: "bg-orange-100 text-orange-700",
};

export function SubscriptionContent({
  properties,
  subscriptions,
  pools,
  transactions,
}: SubscriptionContentProps) {
  const t = useTranslations("home.subscription");
  const [isPending, startTransition] = useTransition();
  const [selectedProperty, setSelectedProperty] = useState<string | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlanKey>("standard");
  const [error, setError] = useState<string | null>(null);
  const [showNewSub, setShowNewSub] = useState(false);

  const getSubForProperty = (propertyId: string) =>
    subscriptions.find((s) => s.property_id === propertyId);

  const getPoolForProperty = (propertyId: string) =>
    pools.find((p) => p.property_id === propertyId);

  const getTransactionsForPool = (poolId: string) =>
    transactions.filter((tx) => tx.pool_id === poolId);

  const handleSubscribe = () => {
    if (!selectedProperty) return;
    setError(null);
    startTransition(async () => {
      const result = await createSubscription({
        plan: selectedPlan,
        propertyId: selectedProperty,
      });
      if (!result.success) setError(result.error ?? "Failed");
      else {
        setShowNewSub(false);
        window.location.reload();
      }
    });
  };

  const handleCancel = (propertyId: string) => {
    startTransition(async () => {
      await cancelSubscription(propertyId);
      window.location.reload();
    });
  };

  const handlePause = (propertyId: string) => {
    startTransition(async () => {
      await pauseSubscription(propertyId);
      window.location.reload();
    });
  };

  const handleResume = (propertyId: string) => {
    startTransition(async () => {
      await resumeSubscription(propertyId);
      window.location.reload();
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Back + header */}
      <div>
        <Link
          href="/home/settings"
          className="inline-flex items-center gap-1 text-sm text-content-tertiary hover:text-content-primary mb-3"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {t("backToSettings")}
        </Link>
        <h1 className="text-2xl font-bold text-content-primary">
          {t("subscriptionTitle")}
        </h1>
        <p className="text-sm text-content-tertiary mt-1">
          {t("subscriptionDesc")}
        </p>
      </div>

      {/* Existing subscriptions */}
      {properties.map((prop) => {
        const sub = getSubForProperty(prop.id);
        const pool = getPoolForProperty(prop.id);

        return (
          <div key={prop.id} className="space-y-4">
            <div className="bg-surface-primary border border-edge-primary rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-content-primary">
                    {prop.name}
                  </h3>
                  {prop.address && (
                    <p className="text-sm text-content-tertiary">{prop.address}</p>
                  )}
                </div>
                {sub && (
                  <span
                    className={`px-2.5 py-0.5 text-xs font-medium rounded-full ${
                      STATUS_COLORS[sub.status] ?? "bg-charcoal-100 text-charcoal-700"
                    }`}
                  >
                    {t(sub.status as "active" | "paused" | "cancelled")}
                  </span>
                )}
              </div>

              {sub ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-3 gap-3 text-sm">
                    <div>
                      <p className="text-content-quaternary text-xs">{t("plan")}</p>
                      <p className="text-content-primary font-medium capitalize">
                        {sub.plan}
                      </p>
                    </div>
                    <div>
                      <p className="text-content-quaternary text-xs">{t("monthly")}</p>
                      <p className="text-content-primary font-medium">
                        ${sub.monthly_amount}/mo
                      </p>
                    </div>
                    <div>
                      <p className="text-content-quaternary text-xs">{t("renewsOn")}</p>
                      <p className="text-content-primary font-medium">
                        {sub.current_period_end
                          ? new Date(sub.current_period_end).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    {sub.status === "active" && (
                      <>
                        <button
                          onClick={() => handlePause(prop.id)}
                          disabled={isPending}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                        >
                          {t("pause")}
                        </button>
                        <button
                          onClick={() => handleCancel(prop.id)}
                          disabled={isPending}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors disabled:opacity-50"
                        >
                          {t("cancel")}
                        </button>
                      </>
                    )}
                    {sub.status === "paused" && (
                      <button
                        onClick={() => handleResume(prop.id)}
                        disabled={isPending}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-green-500/20 text-green-400 hover:bg-green-500/30 transition-colors disabled:opacity-50"
                      >
                        {t("resume")}
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => {
                    setSelectedProperty(prop.id);
                    setShowNewSub(true);
                  }}
                  className="w-full py-2.5 rounded-lg text-sm font-medium bg-rose-500 text-white hover:bg-rose-600 transition-colors"
                >
                  {t("subscribePlan")}
                </button>
              )}
            </div>

            {/* Pool balance for this property */}
            {pool && (
              <PoolBalanceCard
                balance={pool.balance}
                totalDeposited={pool.total_deposited}
                totalSpent={pool.total_spent}
                transactions={getTransactionsForPool(pool.id)}
              />
            )}
          </div>
        );
      })}

      {properties.length === 0 && (
        <div className="text-center py-12 text-content-tertiary">
          <p>{t("noProperties")}</p>
          <Link
            href="/home/property"
            className="inline-block mt-3 text-sm text-rose-500 hover:text-rose-600 font-medium"
          >
            {t("addProperty")}
          </Link>
        </div>
      )}

      {/* New subscription modal */}
      {showNewSub && selectedProperty && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-surface-primary rounded-2xl max-w-md w-full p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-bold text-content-primary mb-4">
              {t("choosePlan")}
            </h3>

            <div className="space-y-3 mb-5">
              {(Object.entries(SUBSCRIPTION_PLANS) as [SubscriptionPlanKey, typeof SUBSCRIPTION_PLANS[SubscriptionPlanKey]][]).map(
                ([key, plan]) => (
                  <button
                    key={key}
                    onClick={() => setSelectedPlan(key)}
                    className={`w-full text-left p-4 rounded-xl border transition-colors ${
                      selectedPlan === key
                        ? "border-rose-500 bg-rose-50/20"
                        : "border-edge-primary hover:border-edge-secondary"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-content-primary">
                        {plan.name}
                      </span>
                      <span className="text-lg font-bold text-rose-500">
                        ${plan.monthly_amount}/mo
                      </span>
                    </div>
                    <p className="text-xs text-content-tertiary">
                      ${plan.pool_deposit_amount} {t("monthlyDeposit")} •{" "}
                      {plan.warranty_days} {t("dayWarranty")}
                      {plan.priority_routing && ` • ${t("priorityRouting")}`}
                      {plan.emergency_access && ` • ${t("emergencyAccess")}`}
                    </p>
                  </button>
                )
              )}
            </div>

            {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => setShowNewSub(false)}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-surface-secondary text-content-tertiary hover:text-content-primary transition-colors"
              >
                {t("cancelBtn")}
              </button>
              <button
                onClick={handleSubscribe}
                disabled={isPending}
                className="flex-1 py-2.5 rounded-lg text-sm font-medium bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-50 transition-colors"
              >
                {isPending ? t("subscribing") : t("subscribe")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
