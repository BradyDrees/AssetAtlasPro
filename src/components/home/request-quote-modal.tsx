"use client";

import { useState, useTransition, useEffect } from "react";
import { useTranslations } from "next-intl";
import { createHomeWorkOrder } from "@/app/actions/home-work-orders";
import { getMyProperty } from "@/app/actions/home-property";

interface RequestQuoteModalProps {
  vendorOrgId: string;
  vendorName: string;
  vendorTrades: string[];
  onClose: () => void;
  onSuccess: (woId: string) => void;
}

type Step = "describe" | "confirm";

export function RequestQuoteModal({
  vendorOrgId,
  vendorName,
  vendorTrades,
  onClose,
  onSuccess,
}: RequestQuoteModalProps) {
  const t = useTranslations("home.vendors");
  const wt = useTranslations("home.workOrders");
  const [step, setStep] = useState<Step>("describe");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [trade, setTrade] = useState(vendorTrades[0] ?? "");
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<"emergency" | "urgent" | "routine" | "whenever">("routine");

  // Property
  const [propertyId, setPropertyId] = useState<string | null>(null);
  const [propertyName, setPropertyName] = useState<string | null>(null);
  const [loadingProperty, setLoadingProperty] = useState(true);
  const [noAccessDetails, setNoAccessDetails] = useState(false);

  useEffect(() => {
    async function load() {
      const prop = await getMyProperty();
      if (prop) {
        setPropertyId(prop.id);
        setPropertyName(prop.address ?? prop.name ?? "My Property");

        const hasAccess =
          Boolean(prop.gate_code?.trim()) ||
          Boolean(prop.lockbox_code?.trim()) ||
          Boolean(prop.alarm_code?.trim()) ||
          Boolean(prop.parking_instructions?.trim());

        if (!hasAccess) {
          setNoAccessDetails(true);
        }
      }
      setLoadingProperty(false);
    }
    load();
  }, []);

  const urgencyOptions = [
    { value: "emergency" as const, label: wt("emergency"), desc: wt("emergencyDesc") },
    { value: "urgent" as const, label: wt("urgent"), desc: wt("urgentDesc") },
    { value: "routine" as const, label: wt("routine"), desc: wt("routineDesc") },
    { value: "whenever" as const, label: wt("whenever"), desc: wt("wheneverDesc") },
  ];

  const handleSubmit = () => {
    if (!propertyId) return;
    setError(null);

    startTransition(async () => {
      const result = await createHomeWorkOrder({
        trade,
        description,
        urgency,
        vendor_selection_mode: "preferred_vendor",
        homeowner_property_id: propertyId,
        request_estimate: true,
      });

      if (result.success && result.id) {
        onSuccess(result.id);
      } else if (result.error === "access_required") {
        setNoAccessDetails(true);
        setStep("describe");
      } else {
        setError(result.error ?? "Failed to submit");
      }
    });
  };

  const canProceed = trade && description.trim().length >= 10;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface-primary rounded-t-2xl sm:rounded-2xl border border-edge-primary max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-surface-primary border-b border-edge-secondary px-6 py-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-content-primary">
                {t("requestQuote")}
              </h2>
              <p className="text-sm text-content-tertiary">{vendorName}</p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-surface-secondary text-content-quaternary"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          {/* Step indicator */}
          <div className="flex gap-2 mt-3">
            <div className={`flex-1 h-1 rounded-full ${step === "describe" ? "bg-rose-500" : "bg-rose-500"}`} />
            <div className={`flex-1 h-1 rounded-full ${step === "confirm" ? "bg-rose-500" : "bg-surface-tertiary"}`} />
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* No access warning */}
          {noAccessDetails && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
              <p className="text-sm text-amber-400 font-medium">{wt("accessRequiredTitle")}</p>
              <p className="text-xs text-content-tertiary mt-1">{wt("accessRequiredBody")}</p>
              <a
                href="/home/property"
                className="text-xs text-rose-400 hover:underline mt-2 inline-block"
              >
                {wt("goToProperty")} &rarr;
              </a>
            </div>
          )}

          {step === "describe" && (
            <>
              {/* Property display */}
              {loadingProperty ? (
                <div className="h-10 bg-surface-secondary animate-pulse rounded-lg" />
              ) : propertyName ? (
                <div className="bg-surface-secondary rounded-lg px-4 py-3">
                  <p className="text-xs text-content-quaternary">{t("quoteProperty")}</p>
                  <p className="text-sm text-content-primary font-medium">{propertyName}</p>
                </div>
              ) : (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <p className="text-sm text-red-400">{t("quoteNoProperty")}</p>
                </div>
              )}

              {/* Trade selection */}
              <div>
                <label className="text-sm font-medium text-content-secondary block mb-2">
                  {wt("trade")}
                </label>
                <select
                  value={trade}
                  onChange={(e) => setTrade(e.target.value)}
                  className="w-full bg-surface-secondary border border-edge-secondary rounded-lg px-4 py-2.5 text-sm text-content-primary"
                >
                  {vendorTrades.map((t) => (
                    <option key={t} value={t} className="capitalize">
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Description */}
              <div>
                <label className="text-sm font-medium text-content-secondary block mb-2">
                  {wt("description")}
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={wt("descriptionPlaceholder")}
                  rows={4}
                  className="w-full bg-surface-secondary border border-edge-secondary rounded-lg px-4 py-3 text-sm text-content-primary placeholder:text-content-quaternary resize-none"
                />
                <p className="text-xs text-content-quaternary mt-1">
                  {description.length < 10 && `10 ${wt("minCharacters")}`}
                </p>
              </div>

              {/* Urgency */}
              <div>
                <label className="text-sm font-medium text-content-secondary block mb-2">
                  {wt("urgencyLabel")}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {urgencyOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setUrgency(opt.value)}
                      className={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
                        urgency === opt.value
                          ? "border-rose-500/50 bg-rose-500/10 text-rose-400"
                          : "border-edge-secondary bg-surface-secondary text-content-tertiary hover:text-content-primary"
                      }`}
                    >
                      <p className="font-medium">{opt.label}</p>
                      <p className="text-xs text-content-quaternary mt-0.5">{opt.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Next button */}
              <button
                onClick={() => setStep("confirm")}
                disabled={!canProceed || !propertyId || noAccessDetails}
                className="w-full py-3 rounded-lg text-sm font-semibold transition-colors bg-rose-600 hover:bg-rose-700 text-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {wt("next")}
              </button>
            </>
          )}

          {step === "confirm" && (
            <>
              {/* Confirmation summary */}
              <div className="bg-surface-secondary rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-xs text-content-quaternary">{t("quoteVendor")}</p>
                  <p className="text-sm text-content-primary font-medium">{vendorName}</p>
                </div>
                <div>
                  <p className="text-xs text-content-quaternary">{wt("trade")}</p>
                  <p className="text-sm text-content-primary capitalize">{trade}</p>
                </div>
                <div>
                  <p className="text-xs text-content-quaternary">{wt("description")}</p>
                  <p className="text-sm text-content-primary">{description}</p>
                </div>
                <div>
                  <p className="text-xs text-content-quaternary">{wt("urgencyLabel")}</p>
                  <p className="text-sm text-content-primary">
                    {urgencyOptions.find((o) => o.value === urgency)?.label}
                  </p>
                </div>
                <div className="pt-2 border-t border-edge-secondary">
                  <p className="text-xs text-rose-400 font-medium">{t("quoteEstimateNote")}</p>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                  <p className="text-sm text-red-400">{error}</p>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("describe")}
                  disabled={isPending}
                  className="flex-1 py-3 rounded-lg text-sm font-medium bg-surface-secondary border border-edge-secondary text-content-tertiary hover:text-content-primary transition-colors"
                >
                  {wt("back")}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={isPending}
                  className="flex-1 py-3 rounded-lg text-sm font-semibold bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-50"
                >
                  {isPending ? wt("submitting") : wt("submit")}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
