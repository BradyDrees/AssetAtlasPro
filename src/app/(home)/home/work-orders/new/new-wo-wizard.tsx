"use client";

import { useState, useTransition, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { createHomeWorkOrder, uploadWorkOrderPhotos } from "@/app/actions/home-work-orders";
import { WoPhotoUpload } from "@/components/home/wo-photo-upload";

type Trade = "plumbing" | "electrical" | "hvac" | "appliance" | "general" | "structural" | "pest" | "cleaning" | "landscaping" | "other";
type Urgency = "emergency" | "urgent" | "routine" | "whenever";
type VendorMode = "auto_match" | "homeowner_choice" | "preferred_vendor";

const TRADE_ICONS: Record<Trade, string> = {
  plumbing: "M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4",
  electrical: "M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z",
  hvac: "M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z",
  appliance: "M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819",
  general: "M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085",
  structural: "M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3.75h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008zm0 3h.008v.008h-.008v-.008z",
  pest: "M12 12.75c1.148 0 2.278.08 3.383.237 1.037.146 1.867.966 1.867 2.013 0 .89-.57 1.648-1.38 1.94-1.216.438-2.526.685-3.87.685-1.344 0-2.654-.247-3.87-.685-.81-.292-1.38-1.05-1.38-1.94 0-1.047.83-1.867 1.867-2.013A24.204 24.204 0 0112 12.75z",
  cleaning: "M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z",
  landscaping: "M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636",
  other: "M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z",
};

const TRADES: Trade[] = ["plumbing", "electrical", "hvac", "appliance", "general", "structural", "pest", "cleaning", "landscaping", "other"];

// ── Gate helpers ──────────────────────────────────────────
interface PropertyGateData {
  id: string;
  gate_code: string | null;
  lockbox_code: string | null;
  alarm_code: string | null;
  parking_instructions: string | null;
  hvac_model: string | null;
  hvac_age: number | null;
  water_heater_type: string | null;
  water_heater_age: number | null;
  electrical_panel: string | null;
  roof_material: string | null;
  roof_age: number | null;
}

function accessEmpty(p: PropertyGateData | null): boolean {
  if (!p) return true;
  return !(
    (p.gate_code?.trim() ?? "").length ||
    (p.lockbox_code?.trim() ?? "").length ||
    (p.alarm_code?.trim() ?? "").length ||
    (p.parking_instructions?.trim() ?? "").length
  );
}

function isFilledText(v: unknown): boolean {
  return typeof v === "string" && v.trim().length > 0;
}

function isFilledNumber(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) && n >= 0;
}

function systemsMostlyEmpty(p: PropertyGateData | null): boolean {
  if (!p) return true;
  const filled = [
    isFilledText(p.hvac_model),
    isFilledNumber(p.hvac_age),
    isFilledText(p.water_heater_type),
    isFilledNumber(p.water_heater_age),
    isFilledText(p.electrical_panel),
    isFilledText(p.roof_material),
    isFilledNumber(p.roof_age),
  ].filter(Boolean).length;
  return filled <= 1;
}

// ── Component ─────────────────────────────────────────────
interface NewWorkOrderWizardProps {
  propertyId: string;
  propertyAddress: string;
  property: PropertyGateData | null;
  systemPhotoCount: number;
}

export function NewWorkOrderWizard({
  propertyId,
  propertyAddress,
  property,
  systemPhotoCount,
}: NewWorkOrderWizardProps) {
  const t = useTranslations("home.workOrders");
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [trade, setTrade] = useState<Trade | null>(null);
  const [description, setDescription] = useState("");
  const [urgency, setUrgency] = useState<Urgency | null>(null);
  const [vendorMode, setVendorMode] = useState<VendorMode | null>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [requestEstimate, setRequestEstimate] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // ── Gates ──
  const blockAccess = accessEmpty(property);

  const [bannerDismissed, setBannerDismissed] = useState(true); // default hidden until checked
  useEffect(() => {
    if (!propertyId) return;
    const key = `dismiss_systems_banner_${propertyId}`;
    const dismissed = localStorage.getItem(key) === "1";
    setBannerDismissed(dismissed);
  }, [propertyId]);

  const showSystemsBanner =
    !bannerDismissed &&
    systemsMostlyEmpty(property) &&
    systemPhotoCount === 0;

  const dismissBanner = () => {
    setBannerDismissed(true);
    localStorage.setItem(`dismiss_systems_banner_${propertyId}`, "1");
  };

  const totalSteps = 4;

  const canNext = () => {
    if (step === 1) return trade !== null;
    if (step === 2) return description.trim().length > 10;
    if (step === 3) return urgency !== null;
    if (step === 4) return vendorMode !== null;
    return false;
  };

  const handleSubmit = () => {
    if (!trade || !urgency || !vendorMode) return;

    startTransition(async () => {
      const result = await createHomeWorkOrder({
        trade,
        description,
        urgency,
        vendor_selection_mode: vendorMode,
        homeowner_property_id: propertyId,
        request_estimate: requestEstimate,
      });

      if (result.success && result.id) {
        // Upload photos if any
        if (photos.length > 0) {
          const formData = new FormData();
          formData.append("work_order_id", result.id);
          photos.forEach((photo, i) => formData.append(`photo_${i}`, photo));
          await uploadWorkOrderPhotos(formData);
        }
        router.push("/home/work-orders");
      } else if (result.error === "access_required") {
        // Server-side gate caught it — show same blocking state
        setError(t("accessRequiredError"));
      } else {
        setError(result.error ?? "Something went wrong");
      }
    });
  };

  const urgencyOptions: { value: Urgency; color: string }[] = [
    { value: "emergency", color: "border-red-500/30 bg-red-500/5 hover:bg-red-500/10" },
    { value: "urgent", color: "border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10" },
    { value: "routine", color: "border-blue-500/30 bg-blue-500/5 hover:bg-blue-500/10" },
    { value: "whenever", color: "border-charcoal-600 bg-charcoal-800/50 hover:bg-charcoal-800" },
  ];

  // ── Blocking modal: access required ──
  if (blockAccess) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-content-primary">{t("newWorkOrder")}</h1>
          <p className="text-sm text-content-tertiary mt-1">{propertyAddress}</p>
        </div>

        <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-amber-500/10 flex items-center justify-center">
            <svg className="w-8 h-8 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <h2 className="text-lg font-semibold text-content-primary">{t("accessRequiredTitle")}</h2>
          <p className="text-sm text-content-tertiary max-w-md mx-auto">
            {t("accessRequiredBody")}
          </p>
          <Link
            href="/home/property"
            className="inline-block px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            {t("goToProperty")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-content-primary">{t("newWorkOrder")}</h1>
        <p className="text-sm text-content-tertiary mt-1">{propertyAddress}</p>
      </div>

      {/* Systems encouragement banner */}
      {showSystemsBanner && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-start gap-3">
          <svg className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
          </svg>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-amber-200 font-medium">{t("systemsBannerTitle")}</p>
            <p className="text-xs text-amber-300/70 mt-0.5">{t("systemsBannerBody")}</p>
            <Link href="/home/property" className="text-xs text-amber-400 hover:text-amber-300 font-medium mt-1 inline-block">
              {t("systemsBannerLink")} →
            </Link>
          </div>
          <button
            onClick={dismissBanner}
            className="text-amber-500/60 hover:text-amber-500 flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Progress */}
      <div className="flex items-center gap-2">
        {Array.from({ length: totalSteps }, (_, i) => (
          <div key={i} className={`h-1.5 rounded-full transition-all ${i + 1 <= step ? "bg-rose-500 flex-1" : "bg-surface-secondary flex-1"}`} />
        ))}
        <span className="text-xs text-content-quaternary ml-2">
          {t("stepOf", { current: step, total: totalSteps })}
        </span>
      </div>

      <div className="bg-surface-primary rounded-xl border border-edge-primary p-6">
        {/* Step 1: Category */}
        {step === 1 && (
          <div>
            <h2 className="text-lg font-semibold text-content-primary mb-1">{t("category")}</h2>
            <p className="text-sm text-content-tertiary mb-4">{t("selectCategory")}</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {TRADES.map((tr) => (
                <button
                  key={tr}
                  onClick={() => setTrade(tr)}
                  className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all text-sm font-medium ${
                    trade === tr
                      ? "border-rose-500 bg-rose-500/10 text-rose-400"
                      : "border-edge-secondary bg-surface-secondary text-content-tertiary hover:border-edge-primary hover:text-content-primary"
                  }`}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d={TRADE_ICONS[tr]} />
                  </svg>
                  {t(tr)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Describe */}
        {step === 2 && (
          <div>
            <h2 className="text-lg font-semibold text-content-primary mb-1">{t("describeIssue")}</h2>
            <p className="text-sm text-content-tertiary mb-4">{t("describeIssueDesc")}</p>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={5}
              className="w-full px-4 py-3 bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none"
              placeholder={t("descriptionPlaceholder")}
            />
            <div className="flex justify-end mt-1.5">
              <span className={`text-xs ${description.trim().length >= 10 ? "text-green-400" : "text-content-quaternary"}`}>
                {description.trim().length} / 10 {t("minCharacters")}
              </span>
            </div>
            <WoPhotoUpload photos={photos} onPhotosChange={setPhotos} />
          </div>
        )}

        {/* Step 3: Urgency */}
        {step === 3 && (
          <div>
            <h2 className="text-lg font-semibold text-content-primary mb-1">{t("selectUrgency")}</h2>
            <div className="space-y-3 mt-4">
              {urgencyOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setUrgency(opt.value)}
                  className={`w-full flex items-start gap-4 p-4 rounded-xl border transition-all text-left ${
                    urgency === opt.value
                      ? "border-rose-500 bg-rose-500/10"
                      : opt.color
                  }`}
                >
                  <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                    urgency === opt.value ? "border-rose-500" : "border-edge-secondary"
                  }`}>
                    {urgency === opt.value && <div className="w-2.5 h-2.5 bg-rose-500 rounded-full" />}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-content-primary">{t(opt.value)}</p>
                    <p className="text-xs text-content-tertiary mt-0.5">{t(`${opt.value}Desc` as "emergencyDesc" | "urgentDesc" | "routineDesc" | "wheneverDesc")}</p>
                  </div>
                </button>
              ))}
            </div>

            {/* Request Estimate toggle */}
            <button
              onClick={() => setRequestEstimate((v) => !v)}
              className={`w-full flex items-center gap-3 p-4 rounded-xl border transition-all mt-4 ${
                requestEstimate
                  ? "border-rose-500 bg-rose-500/10"
                  : "border-edge-secondary bg-surface-secondary hover:border-edge-primary"
              }`}
            >
              <div className={`w-5 h-5 rounded flex-shrink-0 border-2 flex items-center justify-center transition-colors ${
                requestEstimate ? "border-rose-500 bg-rose-500" : "border-edge-secondary"
              }`}>
                {requestEstimate && (
                  <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-content-primary">{t("requestEstimate")}</p>
                <p className="text-xs text-content-tertiary mt-0.5">{t("requestEstimateDesc")}</p>
              </div>
            </button>
          </div>
        )}

        {/* Step 4: Vendor Selection */}
        {step === 4 && (
          <div>
            <h2 className="text-lg font-semibold text-content-primary mb-1">{t("vendorSelection")}</h2>
            <p className="text-sm text-content-tertiary mb-4">{t("vendorSelectionDesc")}</p>
            <div className="space-y-3">
              {(["auto_match", "homeowner_choice", "preferred_vendor"] as VendorMode[]).map((mode) => {
                const labels: Record<VendorMode, string> = {
                  auto_match: t("autoMatch"),
                  homeowner_choice: t("letMeChoose"),
                  preferred_vendor: t("usePreferred"),
                };
                const descs: Record<VendorMode, string> = {
                  auto_match: t("autoMatchDesc"),
                  homeowner_choice: t("letMeChooseDesc"),
                  preferred_vendor: t("usePreferredDesc"),
                };

                return (
                  <button
                    key={mode}
                    onClick={() => setVendorMode(mode)}
                    className={`w-full flex items-start gap-4 p-4 rounded-xl border transition-all text-left ${
                      vendorMode === mode
                        ? "border-rose-500 bg-rose-500/10"
                        : "border-edge-secondary bg-surface-secondary hover:border-edge-primary"
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mt-0.5 flex items-center justify-center ${
                      vendorMode === mode ? "border-rose-500" : "border-edge-secondary"
                    }`}>
                      {vendorMode === mode && <div className="w-2.5 h-2.5 bg-rose-500 rounded-full" />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-content-primary">{labels[mode]}</p>
                      <p className="text-xs text-content-tertiary mt-0.5">{descs[mode]}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-400 mt-3">{error}</p>}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-edge-secondary">
          {step > 1 ? (
            <button onClick={() => setStep((s) => s - 1)} className="text-sm text-content-quaternary hover:text-content-primary transition-colors">
              {t("back")}
            </button>
          ) : (
            <div />
          )}

          {step < totalSteps ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext()}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-charcoal-700 disabled:text-charcoal-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {t("next")}
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canNext() || isPending}
              className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-charcoal-700 disabled:text-charcoal-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isPending ? t("submitting") : t("submit")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
