"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { completeHomeOnboarding } from "@/app/actions/home-onboarding";

type PropertyType = "sfr" | "condo" | "townhouse" | "duplex";

interface PropertyForm {
  address: string;
  city: string;
  state: string;
  zip: string;
  property_type: PropertyType | "";
  year_built: string;
  sqft: string;
  beds: string;
  baths: string;
  // Step 2: Systems & access
  hvac_model: string;
  hvac_age: string;
  water_heater_type: string;
  water_heater_age: string;
  electrical_panel: string;
  roof_material: string;
  roof_age: string;
  gate_code: string;
  lockbox_code: string;
  alarm_code: string;
  pet_warnings: string;
  parking_instructions: string;
}

const INITIAL_FORM: PropertyForm = {
  address: "",
  city: "",
  state: "",
  zip: "",
  property_type: "",
  year_built: "",
  sqft: "",
  beds: "",
  baths: "",
  hvac_model: "",
  hvac_age: "",
  water_heater_type: "",
  water_heater_age: "",
  electrical_panel: "",
  roof_material: "",
  roof_age: "",
  gate_code: "",
  lockbox_code: "",
  alarm_code: "",
  pet_warnings: "",
  parking_instructions: "",
};

export default function HomeOnboardingPage() {
  const t = useTranslations("home.onboarding");
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<PropertyForm>(INITIAL_FORM);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const totalSteps = 3;

  const updateField = (field: keyof PropertyForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (step === 1 && !form.address.trim()) {
      setError(t("required"));
      return;
    }
    setError(null);
    setStep((s) => Math.min(s + 1, totalSteps));
  };

  const handleBack = () => {
    setError(null);
    setStep((s) => Math.max(s - 1, 1));
  };

  const handleFinish = () => {
    startTransition(async () => {
      try {
        const result = await completeHomeOnboarding({
          address: form.address,
          city: form.city || undefined,
          state: form.state || undefined,
          zip: form.zip || undefined,
          property_type: (form.property_type as PropertyType) || undefined,
          year_built: form.year_built ? parseInt(form.year_built) : undefined,
          sqft: form.sqft ? parseInt(form.sqft) : undefined,
          beds: form.beds ? parseInt(form.beds) : undefined,
          baths: form.baths ? parseInt(form.baths) : undefined,
          hvac_model: form.hvac_model || undefined,
          hvac_age: form.hvac_age ? parseInt(form.hvac_age) : undefined,
          water_heater_type: form.water_heater_type || undefined,
          water_heater_age: form.water_heater_age ? parseInt(form.water_heater_age) : undefined,
          electrical_panel: form.electrical_panel || undefined,
          roof_material: form.roof_material || undefined,
          roof_age: form.roof_age ? parseInt(form.roof_age) : undefined,
          gate_code: form.gate_code || undefined,
          lockbox_code: form.lockbox_code || undefined,
          alarm_code: form.alarm_code || undefined,
          pet_warnings: form.pet_warnings || undefined,
          parking_instructions: form.parking_instructions || undefined,
        });

        if (result.success) {
          router.push("/home/dashboard");
        } else {
          setError(result.error ?? "Something went wrong");
        }
      } catch {
        setError("Something went wrong");
      }
    });
  };

  const inputClass =
    "w-full px-4 py-2.5 bg-charcoal-800 border border-charcoal-700 rounded-lg text-white placeholder-charcoal-500 focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 text-sm";
  const labelClass = "block text-sm font-medium text-charcoal-300 mb-1.5";

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">
            Atlas <span className="text-rose-400">Home</span>
          </h1>
          <h2 className="text-xl font-semibold text-white mb-1">{t("title")}</h2>
          <p className="text-charcoal-400 text-sm">{t("subtitle")}</p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i + 1 <= step ? "bg-rose-500 w-12" : "bg-charcoal-700 w-8"
              }`}
            />
          ))}
          <span className="text-xs text-charcoal-500 ml-2">
            {t("stepOf", { current: step, total: totalSteps })}
          </span>
        </div>

        {/* Card */}
        <div className="bg-charcoal-900 border border-charcoal-800 rounded-2xl p-6 shadow-xl">
          {/* Step 1: Property Details */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">{t("step1Title")}</h3>
                <p className="text-sm text-charcoal-400">{t("step1Desc")}</p>
              </div>

              <div>
                <label className={labelClass}>{t("address")} *</label>
                <input
                  type="text"
                  value={form.address}
                  onChange={(e) => updateField("address", e.target.value)}
                  className={inputClass}
                  placeholder="123 Main St"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>{t("city")}</label>
                  <input type="text" value={form.city} onChange={(e) => updateField("city", e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t("state")}</label>
                  <input type="text" value={form.state} onChange={(e) => updateField("state", e.target.value)} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>{t("zip")}</label>
                  <input type="text" value={form.zip} onChange={(e) => updateField("zip", e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t("propertyType")}</label>
                  <select
                    value={form.property_type}
                    onChange={(e) => updateField("property_type", e.target.value)}
                    className={inputClass}
                  >
                    <option value="">—</option>
                    <option value="sfr">{t("sfr")}</option>
                    <option value="condo">{t("condo")}</option>
                    <option value="townhouse">{t("townhouse")}</option>
                    <option value="duplex">{t("duplex")}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className={labelClass}>{t("yearBuilt")}</label>
                  <input type="number" value={form.year_built} onChange={(e) => updateField("year_built", e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t("sqft")}</label>
                  <input type="number" value={form.sqft} onChange={(e) => updateField("sqft", e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t("beds")}</label>
                  <input type="number" value={form.beds} onChange={(e) => updateField("beds", e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t("baths")}</label>
                  <input type="number" value={form.baths} onChange={(e) => updateField("baths", e.target.value)} className={inputClass} />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Systems & Access */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold text-white mb-1">{t("step2Title")}</h3>
                <p className="text-sm text-charcoal-400">{t("step2Desc")}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>{t("hvacModel")}</label>
                  <input type="text" value={form.hvac_model} onChange={(e) => updateField("hvac_model", e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t("hvacAge")}</label>
                  <input type="number" value={form.hvac_age} onChange={(e) => updateField("hvac_age", e.target.value)} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>{t("waterHeaterType")}</label>
                  <input type="text" value={form.water_heater_type} onChange={(e) => updateField("water_heater_type", e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t("waterHeaterAge")}</label>
                  <input type="number" value={form.water_heater_age} onChange={(e) => updateField("water_heater_age", e.target.value)} className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>{t("electricalPanel")}</label>
                  <input type="text" value={form.electrical_panel} onChange={(e) => updateField("electrical_panel", e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t("roofMaterial")}</label>
                  <input type="text" value={form.roof_material} onChange={(e) => updateField("roof_material", e.target.value)} className={inputClass} />
                </div>
              </div>

              <div>
                <label className={labelClass}>{t("roofAge")}</label>
                <input type="number" value={form.roof_age} onChange={(e) => updateField("roof_age", e.target.value)} className={`${inputClass} max-w-32`} />
              </div>

              <hr className="border-charcoal-700" />

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>{t("gateCode")}</label>
                  <input type="text" value={form.gate_code} onChange={(e) => updateField("gate_code", e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t("lockboxCode")}</label>
                  <input type="text" value={form.lockbox_code} onChange={(e) => updateField("lockbox_code", e.target.value)} className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>{t("alarmCode")}</label>
                  <input type="text" value={form.alarm_code} onChange={(e) => updateField("alarm_code", e.target.value)} className={inputClass} />
                </div>
              </div>

              <div>
                <label className={labelClass}>{t("petWarnings")}</label>
                <input type="text" value={form.pet_warnings} onChange={(e) => updateField("pet_warnings", e.target.value)} className={inputClass} placeholder="e.g. Large dog in backyard" />
              </div>

              <div>
                <label className={labelClass}>{t("parkingInstructions")}</label>
                <input type="text" value={form.parking_instructions} onChange={(e) => updateField("parking_instructions", e.target.value)} className={inputClass} placeholder="e.g. Park in driveway" />
              </div>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div className="text-center py-8 space-y-4">
              <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white">{t("step3Title")}</h3>
              <p className="text-sm text-charcoal-400">{t("step3Desc")}</p>
            </div>
          )}

          {/* Error message */}
          {error && (
            <p className="text-sm text-red-400 mt-3">{error}</p>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-charcoal-800">
            {step > 1 ? (
              <button
                onClick={handleBack}
                className="px-4 py-2 text-sm text-charcoal-400 hover:text-white transition-colors"
              >
                {t("back")}
              </button>
            ) : (
              <div />
            )}

            {step < totalSteps ? (
              <div className="flex gap-2">
                {step === 2 && (
                  <button
                    onClick={() => setStep(3)}
                    className="px-4 py-2 text-sm text-charcoal-500 hover:text-charcoal-300 transition-colors"
                  >
                    {t("skip")}
                  </button>
                )}
                <button
                  onClick={handleNext}
                  className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  {t("next")}
                </button>
              </div>
            ) : (
              <button
                onClick={handleFinish}
                disabled={isPending}
                className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-charcoal-700 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {isPending ? t("saving") : t("finish")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
