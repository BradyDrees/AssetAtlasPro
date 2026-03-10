"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { dispatchFindingAsWo } from "@/app/actions/pm-work-orders";
import { getPmVendors } from "@/app/actions/pm-work-orders";
import type { FindingSnapshot } from "@/lib/services/dispatch-service";

interface DispatchFindingModalProps {
  findingId: string;
  finding: FindingSnapshot;
  propertyName?: string;
  propertyAddress?: string;
  unitNumber?: string;
  onClose: () => void;
  onDispatched?: (woId: string) => void;
}

export function DispatchFindingModal({
  findingId,
  finding,
  propertyName,
  propertyAddress,
  unitNumber,
  onClose,
  onDispatched,
}: DispatchFindingModalProps) {
  const t = useTranslations("operate.workOrders");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [vendorOrgId, setVendorOrgId] = useState("");
  const [vendors, setVendors] = useState<Array<{ vendor_org_id: string; vendor_name: string; trades: string[] }>>([]);
  const [error, setError] = useState<string | null>(null);
  const [duplicateWoId, setDuplicateWoId] = useState<string | null>(null);

  // Load PM's vendors
  useEffect(() => {
    getPmVendors().then((res) => {
      if (res.data) setVendors(res.data);
    });
  }, []);

  const priorityLabel =
    finding.priority === 1
      ? "Emergency"
      : finding.priority === 2
        ? "Urgent"
        : "Normal";

  const handleDispatch = (force?: boolean) => {
    setError(null);
    setDuplicateWoId(null);
    startTransition(async () => {
      const result = await dispatchFindingAsWo({
        findingId,
        finding,
        vendorOrgId: vendorOrgId || undefined,
        propertyName,
        propertyAddress,
        unitNumber,
        force,
      });

      if (result.skipped && result.existingWoId) {
        setDuplicateWoId(result.existingWoId);
        setError(t("dispatch.duplicateExists"));
        return;
      }

      if (!result.success) {
        setError(result.error ?? t("dispatch.failed"));
        return;
      }

      onDispatched?.(result.woId!);
      onClose();
      router.refresh();
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-surface-primary rounded-xl border border-edge-primary w-full max-w-md p-5 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-content-primary">{t("dispatch.title")}</h2>
          <button onClick={onClose} className="text-content-quaternary hover:text-content-primary">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Finding summary */}
        <div className="bg-surface-secondary rounded-lg p-3 space-y-1">
          <p className="text-sm font-medium text-content-primary">{finding.title}</p>
          {finding.description && (
            <p className="text-xs text-content-tertiary">{finding.description}</p>
          )}
          <div className="flex gap-2 text-xs">
            <span className={`px-1.5 py-0.5 rounded font-medium ${
              finding.priority <= 1 ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400" :
              finding.priority === 2 ? "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400" :
              "bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400"
            }`}>
              {priorityLabel}
            </span>
            {finding.trade && (
              <span className="text-content-quaternary">{finding.trade}</span>
            )}
            {finding.estimatedExposure != null && (
              <span className="text-content-quaternary">
                ${finding.estimatedExposure.toLocaleString()}
              </span>
            )}
          </div>
        </div>

        {/* Vendor selector */}
        <div>
          <label className="text-xs text-content-quaternary">{t("dispatch.selectVendor")}</label>
          <select
            value={vendorOrgId}
            onChange={(e) => setVendorOrgId(e.target.value)}
            className="w-full mt-0.5 px-2.5 py-2 text-sm bg-surface-secondary border border-edge-primary rounded-lg text-content-primary"
          >
            <option value="">{t("dispatch.noVendor")}</option>
            {vendors.map((v) => (
              <option key={v.vendor_org_id} value={v.vendor_org_id}>
                {v.vendor_name}
                {v.trades.length > 0 ? ` (${v.trades.join(", ")})` : ""}
              </option>
            ))}
          </select>
        </div>

        {/* Property context */}
        {propertyName && (
          <div className="text-xs text-content-tertiary">
            {propertyName}
            {propertyAddress && ` \u2014 ${propertyAddress}`}
            {unitNumber && ` \u00b7 Unit ${unitNumber}`}
          </div>
        )}

        {/* Error / Duplicate */}
        {error && (
          <div className="space-y-2">
            <p className="text-xs text-red-500">{error}</p>
            {duplicateWoId && (
              <div className="flex gap-2">
                <button
                  onClick={() => handleDispatch(true)}
                  disabled={isPending}
                  className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors disabled:opacity-50"
                >
                  {t("dispatch.createAnyway")}
                </button>
                <a
                  href={`/operate/work-orders/${duplicateWoId}`}
                  className="px-3 py-1.5 text-xs font-semibold text-content-primary bg-surface-tertiary rounded-lg hover:bg-surface-secondary transition-colors"
                >
                  {t("dispatch.viewExisting")}
                </a>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2">
          <button
            onClick={() => handleDispatch()}
            disabled={isPending}
            className="flex-1 px-4 py-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors disabled:opacity-50"
          >
            {isPending ? t("dispatch.creating") : t("dispatch.createWo")}
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-semibold text-content-tertiary bg-surface-tertiary rounded-lg hover:bg-surface-secondary transition-colors"
          >
            {t("actions.cancel")}
          </button>
        </div>
      </div>
    </div>
  );
}
