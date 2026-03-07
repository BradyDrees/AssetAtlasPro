"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  getAgreementDetail,
  pauseAgreement,
  resumeAgreement,
  cancelAgreement,
  generateWoFromAgreement,
} from "@/app/actions/vendor-agreements";
import type { ServiceAgreement } from "@/lib/vendor/agreement-types";
import { AGREEMENT_STATUS_COLORS } from "@/lib/vendor/agreement-types";

export default function AgreementDetailPage() {
  const t = useTranslations("vendor.agreements");
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [agreement, setAgreement] = useState<ServiceAgreement | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const result = await getAgreementDetail(id);
    setAgreement(result.agreement ?? null);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAction(action: "pause" | "resume" | "cancel" | "generate") {
    if (!agreement) return;
    setActing(true);
    let result: { error?: string; woId?: string };
    switch (action) {
      case "pause":
        result = await pauseAgreement(agreement.id);
        break;
      case "resume":
        result = await resumeAgreement(agreement.id);
        break;
      case "cancel":
        result = await cancelAgreement(agreement.id);
        break;
      case "generate":
        result = await generateWoFromAgreement(agreement.id);
        break;
    }
    setActing(false);
    if (result.error) {
      alert(result.error);
    } else {
      load();
    }
  }

  if (loading) {
    return (
      <div className="max-w-3xl mx-auto space-y-4 animate-pulse">
        <div className="h-8 bg-surface-secondary rounded w-1/3" />
        <div className="h-40 bg-surface-secondary rounded-xl" />
      </div>
    );
  }

  if (!agreement) {
    return (
      <div className="max-w-3xl mx-auto text-center py-12">
        <p className="text-content-tertiary">{t("notFound")}</p>
      </div>
    );
  }

  const statusColor = AGREEMENT_STATUS_COLORS[agreement.status] ?? "";

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/vendor/agreements")}
          className="p-2 text-content-tertiary hover:text-content-primary transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-content-primary">
              {agreement.service_type || agreement.trade}
            </h1>
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statusColor}`}>
              {t(`status.${agreement.status}` as Parameters<typeof t>[0])}
            </span>
          </div>
          {agreement.property_name && (
            <p className="text-sm text-content-tertiary">{agreement.property_name}</p>
          )}
        </div>
      </div>

      {/* Details card */}
      <div className="bg-surface-primary rounded-xl border border-edge-primary divide-y divide-edge-primary">
        <DetailRow label={t("trade")} value={agreement.trade} />
        <DetailRow
          label={t("frequencyLabel")}
          value={t(`frequency.${agreement.frequency}` as Parameters<typeof t>[0])}
        />
        <DetailRow label={t("price")} value={`$${Number(agreement.price).toFixed(2)}`} />
        <DetailRow
          label={t("nextDue")}
          value={
            agreement.next_due
              ? new Date(agreement.next_due + "T00:00:00").toLocaleDateString(undefined, {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })
              : "—"
          }
        />
        {agreement.start_date && (
          <DetailRow
            label={t("startDate")}
            value={new Date(agreement.start_date + "T00:00:00").toLocaleDateString()}
          />
        )}
        {agreement.end_date && (
          <DetailRow
            label={t("endDate")}
            value={new Date(agreement.end_date + "T00:00:00").toLocaleDateString()}
          />
        )}
        {agreement.last_generated && (
          <DetailRow
            label={t("lastGenerated")}
            value={new Date(agreement.last_generated + "T00:00:00").toLocaleDateString()}
          />
        )}
        {agreement.description && (
          <DetailRow label={t("description")} value={agreement.description} />
        )}
        {agreement.notes && <DetailRow label={t("notes")} value={agreement.notes} />}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        {agreement.status === "active" && (
          <>
            <button
              onClick={() => handleAction("generate")}
              disabled={acting}
              className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50 transition-colors"
            >
              {t("generateWo")}
            </button>
            <button
              onClick={() => handleAction("pause")}
              disabled={acting}
              className="px-4 py-2 text-sm border border-yellow-500/50 text-yellow-400 rounded-lg hover:bg-yellow-500/10 disabled:opacity-50 transition-colors"
            >
              {t("pause")}
            </button>
            <button
              onClick={() => handleAction("cancel")}
              disabled={acting}
              className="px-4 py-2 text-sm border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/10 disabled:opacity-50 transition-colors"
            >
              {t("cancelAgreement")}
            </button>
          </>
        )}
        {agreement.status === "paused" && (
          <>
            <button
              onClick={() => handleAction("resume")}
              disabled={acting}
              className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50 transition-colors"
            >
              {t("resume")}
            </button>
            <button
              onClick={() => handleAction("cancel")}
              disabled={acting}
              className="px-4 py-2 text-sm border border-red-500/50 text-red-400 rounded-lg hover:bg-red-500/10 disabled:opacity-50 transition-colors"
            >
              {t("cancelAgreement")}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between px-4 py-3">
      <span className="text-sm text-content-tertiary">{label}</span>
      <span className="text-sm text-content-primary font-medium text-right max-w-[60%]">{value}</span>
    </div>
  );
}
