"use client";

import { useState, useCallback, useEffect } from "react";
import { useTranslations } from "next-intl";
import type { VendorPhoneNumber } from "@/lib/vendor/types";
import {
  getOrgPhoneNumbers,
  searchNumbers,
  purchasePhoneNumber,
  releasePhoneNumber,
  setDefaultPhoneNumber,
  updatePhoneNumberName,
  getTwilioStatus,
} from "@/app/actions/vendor-messages";

export function PhoneNumberManager() {
  const t = useTranslations("vendor.messages");
  const [numbers, setNumbers] = useState<VendorPhoneNumber[]>([]);
  const [loading, setLoading] = useState(true);
  const [configured, setConfigured] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [areaCode, setAreaCode] = useState("");
  const [available, setAvailable] = useState<{ phoneNumber: string; friendlyName: string; locality: string; region: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [releasing, setReleasing] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");

  const loadNumbers = useCallback(async () => {
    const [status, result] = await Promise.all([
      getTwilioStatus(),
      getOrgPhoneNumbers(),
    ]);
    setConfigured(status.configured);
    setNumbers(result.data);
    setLoading(false);
  }, []);

  useEffect(() => { loadNumbers(); }, [loadNumbers]);

  const handleSearch = useCallback(async () => {
    setSearching(true);
    const result = await searchNumbers(areaCode || undefined);
    setAvailable(result.numbers);
    setSearching(false);
  }, [areaCode]);

  const handlePurchase = useCallback(async (phoneNumber: string) => {
    setPurchasing(phoneNumber);
    const result = await purchasePhoneNumber(phoneNumber);
    if (!result.error) {
      setShowSearch(false);
      setAvailable([]);
      await loadNumbers();
    }
    setPurchasing(null);
  }, [loadNumbers]);

  const handleRelease = useCallback(async (id: string) => {
    setReleasing(id);
    await releasePhoneNumber(id);
    await loadNumbers();
    setReleasing(null);
  }, [loadNumbers]);

  const handleSetDefault = useCallback(async (id: string) => {
    await setDefaultPhoneNumber(id);
    await loadNumbers();
  }, [loadNumbers]);

  const handleNameSave = useCallback(async (id: string) => {
    await updatePhoneNumberName(id, nameDraft);
    setEditingName(null);
    await loadNumbers();
  }, [nameDraft, loadNumbers]);

  if (loading) {
    return <div className="animate-pulse h-20 bg-surface-secondary rounded-lg" />;
  }

  if (!configured) {
    return (
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
        <h3 className="text-sm font-semibold text-content-primary mb-2">
          {t("phoneNumbers")}
        </h3>
        <p className="text-sm text-content-tertiary">
          {t("notConfigured")}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-content-primary">
          {t("phoneNumbers")}
        </h3>
        <button
          type="button"
          onClick={() => { setShowSearch(true); handleSearch(); }}
          className="px-3 py-1.5 text-xs font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-500 transition-colors"
        >
          {t("buyNumber")}
        </button>
      </div>

      {/* Existing numbers */}
      {numbers.length === 0 ? (
        <p className="text-sm text-content-quaternary">{t("noNumbers")}</p>
      ) : (
        <div className="space-y-2">
          {numbers.map((num) => (
            <div
              key={num.id}
              className="flex items-center justify-between p-3 bg-surface-secondary rounded-lg border border-edge-secondary"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-mono text-content-primary">
                    {num.twilio_number}
                  </span>
                  {num.is_default && (
                    <span className="text-[10px] font-medium px-1.5 py-0.5 bg-brand-600/20 text-brand-400 rounded">
                      {t("default")}
                    </span>
                  )}
                </div>
                {editingName === num.id ? (
                  <div className="flex items-center gap-1 mt-1">
                    <input
                      type="text"
                      value={nameDraft}
                      onChange={(e) => setNameDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleNameSave(num.id);
                        if (e.key === "Escape") setEditingName(null);
                      }}
                      className="text-xs px-2 py-0.5 bg-surface-tertiary border border-edge-tertiary rounded text-content-primary"
                      autoFocus
                    />
                    <button type="button" onClick={() => handleNameSave(num.id)} className="text-xs text-brand-500">
                      {t("save")}
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setEditingName(num.id); setNameDraft(num.friendly_name); }}
                    className="text-xs text-content-quaternary hover:text-content-secondary mt-0.5"
                  >
                    {num.friendly_name || t("addLabel")}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                {!num.is_default && (
                  <button
                    type="button"
                    onClick={() => handleSetDefault(num.id)}
                    className="text-xs text-content-tertiary hover:text-brand-500 px-2 py-1"
                  >
                    {t("setDefault")}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleRelease(num.id)}
                  disabled={releasing === num.id}
                  className="text-xs text-red-400 hover:text-red-300 px-2 py-1 disabled:opacity-50"
                >
                  {releasing === num.id ? "..." : t("release")}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Number search modal */}
      {showSearch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-surface-primary rounded-xl border border-edge-primary p-6 max-w-md w-full space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-content-primary">{t("searchNumbers")}</h3>
              <button type="button" onClick={() => setShowSearch(false)} className="text-content-tertiary hover:text-content-primary">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={areaCode}
                onChange={(e) => setAreaCode(e.target.value.replace(/\D/g, "").slice(0, 3))}
                placeholder={t("areaCodePlaceholder")}
                className="flex-1 px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary"
              />
              <button
                type="button"
                onClick={handleSearch}
                disabled={searching}
                className="px-4 py-2 text-sm bg-brand-600 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50 transition-colors"
              >
                {searching ? "..." : t("search")}
              </button>
            </div>

            {available.length > 0 && (
              <div className="space-y-1.5">
                {available.map((num) => (
                  <div
                    key={num.phoneNumber}
                    className="flex items-center justify-between p-2.5 bg-surface-secondary rounded-lg"
                  >
                    <div>
                      <span className="text-sm font-mono text-content-primary">{num.phoneNumber}</span>
                      {num.locality && (
                        <span className="text-xs text-content-quaternary ml-2">{num.locality}, {num.region}</span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handlePurchase(num.phoneNumber)}
                      disabled={purchasing !== null}
                      className="px-3 py-1 text-xs font-medium bg-brand-600 text-white rounded-lg hover:bg-brand-500 disabled:opacity-50 transition-colors"
                    >
                      {purchasing === num.phoneNumber ? "..." : t("buy")}
                    </button>
                  </div>
                ))}
              </div>
            )}

            {!searching && available.length === 0 && (
              <p className="text-sm text-content-quaternary text-center py-4">
                {t("noAvailable")}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
