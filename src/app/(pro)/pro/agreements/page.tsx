"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { getAgreements, getAgreementSummary } from "@/app/actions/vendor-agreements";
import type { ServiceAgreement } from "@/lib/vendor/agreement-types";
import type { AgreementStatus } from "@/lib/vendor/agreement-types";
import { AgreementCard } from "@/components/vendor/agreement-card";
import { AgreementFormModal } from "@/components/vendor/agreement-form-modal";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";

const STATUS_TABS: { key: "all" | AgreementStatus; statuses?: AgreementStatus[] }[] = [
  { key: "all" },
  { key: "active", statuses: ["active"] },
  { key: "paused", statuses: ["paused"] },
  { key: "cancelled", statuses: ["cancelled"] },
  { key: "expired", statuses: ["expired"] },
];

export default function ProAgreementsPage() {
  const t = useTranslations("vendor.agreements");
  const router = useRouter();

  const [agreements, setAgreements] = useState<ServiceAgreement[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"all" | AgreementStatus>("all");
  const [showCreate, setShowCreate] = useState(false);
  const [summary, setSummary] = useState({ active: 0, paused: 0, totalMonthlyRevenue: 0 });

  const load = useCallback(async () => {
    setLoading(true);
    const statusFilter = STATUS_TABS.find((s) => s.key === tab)?.statuses;
    const [listRes, summaryRes] = await Promise.all([
      getAgreements({ status: statusFilter }),
      getAgreementSummary(),
    ]);
    setAgreements(listRes.data);
    setSummary(summaryRes);
    setLoading(false);
  }, [tab]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      <PageHeader
        title={t("title")}
        subtitle={t("subtitle")}
        action={
          <button
            onClick={() => setShowCreate(true)}
            className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-500 transition-colors flex items-center gap-1.5"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            {t("create")}
          </button>
        }
      />

      {!loading && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-surface-primary rounded-xl border border-edge-primary p-4 text-center">
            <p className="text-2xl font-bold text-green-400">{summary.active}</p>
            <p className="text-xs text-content-tertiary">{t("status.active")}</p>
          </div>
          <div className="bg-surface-primary rounded-xl border border-edge-primary p-4 text-center">
            <p className="text-2xl font-bold text-yellow-400">{summary.paused}</p>
            <p className="text-xs text-content-tertiary">{t("status.paused")}</p>
          </div>
          <div className="bg-surface-primary rounded-xl border border-edge-primary p-4 text-center">
            <p className="text-2xl font-bold text-brand-400">${summary.totalMonthlyRevenue.toFixed(0)}</p>
            <p className="text-xs text-content-tertiary">{t("monthlyRevenue")}</p>
          </div>
        </div>
      )}

      <div className="flex gap-1 bg-surface-secondary rounded-lg p-1 overflow-x-auto">
        {STATUS_TABS.map(({ key }) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-shrink-0 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              tab === key ? "bg-surface-primary text-content-primary shadow-sm" : "text-content-tertiary hover:text-content-secondary"
            }`}
          >
            {key === "all" ? t("filterAll") : t(`status.${key}` as Parameters<typeof t>[0])}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface-primary rounded-xl border border-edge-primary p-4 animate-pulse">
              <div className="h-4 bg-surface-secondary rounded w-3/4 mb-2" />
              <div className="h-3 bg-surface-secondary rounded w-1/2" />
            </div>
          ))}
        </div>
      ) : agreements.length === 0 ? (
        <EmptyState
          icon="clipboard"
          title={t("noAgreements")}
          subtitle={t("emptySubtitle")}
          action={{ label: t("createFirst"), onClick: () => setShowCreate(true) }}
        />
      ) : (
        <div className="space-y-3">
          {agreements.map((a) => (
            <AgreementCard key={a.id} agreement={a} basePath="/pro" />
          ))}
        </div>
      )}

      <AgreementFormModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={(id) => {
          setShowCreate(false);
          router.push(`/pro/agreements/${id}`);
        }}
      />
    </div>
  );
}
