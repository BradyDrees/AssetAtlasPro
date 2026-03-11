"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { createEmergencySOS } from "@/app/actions/home-emergency";

const EMERGENCY_TYPES = [
  { id: "water", icon: "💧", colorClass: "border-blue-500/50 bg-blue-500/5 hover:bg-blue-500/10" },
  { id: "electrical", icon: "⚡", colorClass: "border-amber-500/50 bg-amber-500/5 hover:bg-amber-500/10" },
  { id: "gas", icon: "🔥", colorClass: "border-orange-500/50 bg-orange-500/5 hover:bg-orange-500/10" },
  { id: "fire", icon: "🧯", colorClass: "border-red-500/50 bg-red-500/5 hover:bg-red-500/10" },
  { id: "lockout", icon: "🔒", colorClass: "border-purple-500/50 bg-purple-500/5 hover:bg-purple-500/10" },
  { id: "other", icon: "🚨", colorClass: "border-rose-500/50 bg-rose-500/5 hover:bg-rose-500/10" },
] as const;

const SAFETY_TYPES = ["gas", "fire"]; // Types that show 911 warning

type Step = "select" | "describe" | "confirm" | "success";

export function EmergencyContent() {
  const t = useTranslations("home.emergency");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [step, setStep] = useState<Step>("select");
  const [selectedType, setSelectedType] = useState<string>("");
  const [description, setDescription] = useState("");
  const [safetyAck, setSafetyAck] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resultWoId, setResultWoId] = useState<string | null>(null);

  const needsSafetyAck = SAFETY_TYPES.includes(selectedType);

  const handleSelectType = (typeId: string) => {
    setSelectedType(typeId);
    setError(null);
    setStep("describe");
  };

  const handleProceedToConfirm = () => {
    if (!description.trim()) return;
    if (needsSafetyAck && !safetyAck) return;
    setStep("confirm");
  };

  const handleSubmit = () => {
    startTransition(async () => {
      const result = await createEmergencySOS({
        emergencyType: selectedType,
        description: description.trim(),
      });

      if (result.success) {
        setResultWoId(result.woId ?? null);
        setStep("success");
      } else {
        // Map error codes to i18n keys
        if (result.errorCode === "duplicate") {
          setError(t("duplicateError"));
        } else if (result.errorCode === "rate_limit") {
          setError(t("rateLimitError"));
        } else if (result.errorCode === "no_property") {
          setError(t("noProperty"));
        } else {
          setError(result.error ?? "Something went wrong");
        }
        setStep("describe");
      }
    });
  };

  // ── Step: Select Emergency Type ──
  if (step === "select") {
    return (
      <div className="space-y-3">
        <p className="text-sm font-medium text-content-secondary text-center">
          {t("selectType")}
        </p>
        <div className="grid grid-cols-2 gap-3">
          {EMERGENCY_TYPES.map((type) => (
            <button
              key={type.id}
              onClick={() => handleSelectType(type.id)}
              className={`p-4 rounded-xl border-2 ${type.colorClass} transition-all text-center`}
            >
              <span className="text-3xl block mb-2">{type.icon}</span>
              <span className="text-sm font-medium text-content-primary">
                {t(`type${type.id.charAt(0).toUpperCase() + type.id.slice(1)}` as Parameters<typeof t>[0])}
              </span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Step: Describe Issue ──
  if (step === "describe") {
    return (
      <div className="space-y-4">
        {/* Selected type pill */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-lg">
            {EMERGENCY_TYPES.find((t) => t.id === selectedType)?.icon}
          </span>
          <span className="text-sm font-semibold text-content-primary">
            {t(`type${selectedType.charAt(0).toUpperCase() + selectedType.slice(1)}` as Parameters<typeof t>[0])}
          </span>
          <button
            onClick={() => {
              setStep("select");
              setSelectedType("");
              setDescription("");
              setSafetyAck(false);
              setError(null);
            }}
            className="text-xs text-content-quaternary hover:text-content-tertiary ml-2"
          >
            {t("cancel")}
          </button>
        </div>

        {/* Safety warning for gas/fire */}
        {needsSafetyAck && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4">
            <p className="text-sm text-red-400 font-medium mb-3">
              ⚠️ {t("safetyWarning")}
            </p>
            <label className="flex items-start gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={safetyAck}
                onChange={(e) => setSafetyAck(e.target.checked)}
                className="mt-0.5 accent-red-500"
              />
              <span className="text-xs text-content-tertiary">
                {t("safetyAcknowledge")}
              </span>
            </label>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-xs font-medium text-content-tertiary mb-1">
            {t("describeIssue")}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("descriptionPlaceholder")}
            rows={3}
            className="w-full px-3 py-2 bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
          />
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-3 py-2 text-sm text-red-400">
            {error}
          </div>
        )}

        {/* Proceed button */}
        <button
          onClick={handleProceedToConfirm}
          disabled={
            !description.trim() || (needsSafetyAck && !safetyAck)
          }
          className="w-full py-3 bg-red-600 hover:bg-red-700 disabled:bg-charcoal-700 disabled:text-charcoal-500 text-white text-sm font-bold rounded-xl transition-colors"
        >
          {t("confirmSubmit")}
        </button>
      </div>
    );
  }

  // ── Step: Confirm ──
  if (step === "confirm") {
    return (
      <div className="space-y-4">
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-6 text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-3">
            <svg
              className="w-6 h-6 text-red-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-bold text-content-primary mb-2">
            {t("confirmTitle")}
          </h3>
          <p className="text-sm text-content-tertiary">
            {t("confirmMessage")}
          </p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setStep("describe")}
            disabled={isPending}
            className="flex-1 py-3 bg-surface-secondary hover:bg-surface-tertiary border border-edge-secondary text-content-tertiary text-sm font-medium rounded-xl transition-colors"
          >
            {t("cancel")}
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="flex-1 py-3 bg-red-600 hover:bg-red-700 disabled:bg-charcoal-700 disabled:text-charcoal-500 text-white text-sm font-bold rounded-xl transition-colors"
          >
            {isPending ? t("submitting") : t("confirmSubmit")}
          </button>
        </div>
      </div>
    );
  }

  // ── Step: Success ──
  return (
    <div className="text-center space-y-4">
      <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
        <svg
          className="w-8 h-8 text-green-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-content-primary">
        {t("successTitle")}
      </h2>
      <p className="text-sm text-content-tertiary">{t("successMessage")}</p>

      {resultWoId && (
        <button
          onClick={() => router.push(`/home/work-orders/${resultWoId}`)}
          className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white text-sm font-medium rounded-xl transition-colors"
        >
          {t("viewWorkOrder")}
        </button>
      )}
    </div>
  );
}
