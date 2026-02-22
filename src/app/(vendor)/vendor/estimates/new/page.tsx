"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { createEstimate } from "@/app/actions/vendor-estimates";
import { getPmVendors } from "@/app/actions/pm-work-orders";

interface PmClient {
  id: string;
  vendor_org_id: string;
  vendor_name: string;
  trades: string[];
  status: string;
}

export default function NewEstimatePage() {
  const t = useTranslations("vendor.estimates");
  const router = useRouter();
  const [creating, setCreating] = useState(false);

  const [title, setTitle] = useState("");
  const [propertyName, setPropertyName] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [unitInfo, setUnitInfo] = useState("");
  const [description, setDescription] = useState("");
  const [pmUserId, setPmUserId] = useState("");

  // We'll load connected PMs — but from the vendor side, we need
  // to fetch our PM relationships differently. For now, the vendor can
  // manually set PM later in the builder. We'll still try to
  // load vendor_pm_relationships from the client.
  const [pmClients, setPmClients] = useState<
    Array<{ pm_user_id: string; pm_name: string }>
  >([]);
  const [loadingClients, setLoadingClients] = useState(true);

  useEffect(() => {
    async function loadClients() {
      try {
        // Fetch vendor's PM relationships from a vendor-specific action
        const res = await fetch("/api/vendor/pm-clients");
        if (res.ok) {
          const data = await res.json();
          setPmClients(data.clients || []);
        }
      } catch {
        // Silently fail — PM selection will be optional
      } finally {
        setLoadingClients(false);
      }
    }
    loadClients();
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const { data, error } = await createEstimate({
        title: title || undefined,
        property_name: propertyName || undefined,
        property_address: propertyAddress || undefined,
        unit_info: unitInfo || undefined,
        description: description || undefined,
        pm_user_id: pmUserId || undefined,
      });

      if (error) {
        alert(error);
        return;
      }

      if (data) {
        router.push(`/vendor/estimates/${data.id}`);
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => router.push("/vendor/estimates")}
          className="p-2 text-content-tertiary hover:text-content-primary transition-colors"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-content-primary">{t("new")}</h1>
      </div>

      {/* Form */}
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-content-secondary mb-1">
            {t("estimateTitle")}
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary placeholder:text-content-quaternary"
            placeholder={t("titlePlaceholder")}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-content-secondary mb-1">
              {t("propertyName")}
            </label>
            <input
              type="text"
              value={propertyName}
              onChange={(e) => setPropertyName(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary placeholder:text-content-quaternary"
              placeholder={t("propertyNamePlaceholder")}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-content-secondary mb-1">
              {t("unitInfo")}
            </label>
            <input
              type="text"
              value={unitInfo}
              onChange={(e) => setUnitInfo(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary placeholder:text-content-quaternary"
              placeholder={t("unitInfoPlaceholder")}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-content-secondary mb-1">
            {t("propertyAddress")}
          </label>
          <input
            type="text"
            value={propertyAddress}
            onChange={(e) => setPropertyAddress(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary placeholder:text-content-quaternary"
            placeholder={t("addressPlaceholder")}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-content-secondary mb-1">
            {t("description")}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary resize-none placeholder:text-content-quaternary"
            placeholder={t("descriptionPlaceholder")}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-content-secondary mb-1">
            {t("selectPm")}
          </label>
          {loadingClients ? (
            <div className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-quaternary animate-pulse">
              {t("loadingClients")}
            </div>
          ) : pmClients.length > 0 ? (
            <select
              value={pmUserId}
              onChange={(e) => setPmUserId(e.target.value)}
              className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary"
            >
              <option value="">{t("selectPmPlaceholder")}</option>
              {pmClients.map((pm) => (
                <option key={pm.pm_user_id} value={pm.pm_user_id}>
                  {pm.pm_name}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-xs text-content-quaternary">
              {t("noPmConnections")}
            </p>
          )}
          <p className="text-xs text-content-quaternary mt-1">
            {t("pmAssignLater")}
          </p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <button
          onClick={() => router.push("/vendor/estimates")}
          className="px-4 py-2 text-sm text-content-secondary hover:text-content-primary transition-colors"
        >
          {t("cancel")}
        </button>
        <button
          onClick={handleCreate}
          disabled={creating}
          className="px-5 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50 transition-colors"
        >
          {creating ? t("creating") : t("createEstimate")}
        </button>
      </div>
    </div>
  );
}
