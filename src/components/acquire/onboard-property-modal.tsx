"use client";

import { useState, useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  getProjectForOnboarding,
  executeOnboarding,
} from "@/app/actions/acquire-onboard";

interface OnboardPropertyModalProps {
  projectId: string;
  projectName: string;
  projectAddress: string;
  onClose: () => void;
}

type Step = "select" | "confirm" | "result";

interface Finding {
  id: string;
  sectionName: string;
  description: string;
  priority: number;
  trade: string;
  estimatedExposure: number;
}

const priorityColors: Record<number, string> = {
  1: "bg-red-500/20 text-red-400 border-red-500/30",
  2: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  3: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  4: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  5: "bg-gray-500/20 text-gray-400 border-gray-500/30",
};

const priorityLabels: Record<number, string> = {
  1: "P1 - Immediate",
  2: "P2 - Urgent",
  3: "P3 - Short Term",
  4: "P4 - Routine",
  5: "P5 - Low",
};

export function OnboardPropertyModal({
  projectId,
  projectName,
  projectAddress,
  onClose,
}: OnboardPropertyModalProps) {
  const t = useTranslations("review");
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState<Step>("select");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Data
  const [findings, setFindings] = useState<Finding[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [address, setAddress] = useState(projectAddress);

  // Result
  const [resultPropertyId, setResultPropertyId] = useState<string | null>(null);
  const [resultWoCount, setResultWoCount] = useState(0);

  useEffect(() => {
    async function load() {
      const result = await getProjectForOnboarding(projectId);
      if (result.error === "already_onboarded") {
        setError(t("alreadyOnboarded"));
      } else if (result.data) {
        setFindings(result.data.findings);
        // Auto-select P1-P2 findings
        const autoSelected = new Set(
          result.data.findings
            .filter((f) => f.priority <= 2)
            .map((f) => f.id)
        );
        setSelectedIds(autoSelected);
      }
      setLoading(false);
    }
    load();
  }, [projectId, t]);

  const toggleFinding = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === findings.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(findings.map((f) => f.id)));
    }
  };

  const handleOnboard = () => {
    setError(null);
    startTransition(async () => {
      const result = await executeOnboarding({
        projectId,
        selectedFindingIds: Array.from(selectedIds),
        propertyAddress: address,
      });

      if (result.success) {
        setResultPropertyId(result.propertyId ?? null);
        setResultWoCount(result.woCount ?? 0);
        setStep("result");
      } else {
        setError(result.error ?? "Onboarding failed");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-surface-primary rounded-2xl border border-edge-primary max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-surface-primary border-b border-edge-secondary px-6 py-4 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-content-primary">
                {t("onboardTitle")}
              </h2>
              <p className="text-sm text-content-tertiary">{projectName}</p>
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
        </div>

        <div className="p-6 space-y-4">
          {/* Error */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-surface-secondary rounded-lg animate-pulse" />
              ))}
            </div>
          ) : step === "select" ? (
            <>
              {/* Address */}
              <div>
                <label className="text-sm font-medium text-content-secondary block mb-1">
                  {t("onboardAddress")}
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-surface-secondary border border-edge-secondary rounded-lg text-content-primary"
                />
              </div>

              {/* Findings selection */}
              {findings.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-sm font-medium text-content-secondary">
                      {t("onboardFindings")} ({selectedIds.size}/{findings.length})
                    </label>
                    <button
                      onClick={toggleAll}
                      className="text-xs text-brand-400 hover:text-brand-300"
                    >
                      {selectedIds.size === findings.length ? t("onboardDeselectAll") : t("onboardSelectAll")}
                    </button>
                  </div>

                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {findings.map((f) => (
                      <label
                        key={f.id}
                        className={`flex items-start gap-3 px-3 py-2.5 rounded-lg border cursor-pointer transition-colors ${
                          selectedIds.has(f.id)
                            ? "border-brand-500/30 bg-brand-500/5"
                            : "border-edge-secondary bg-surface-secondary"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={selectedIds.has(f.id)}
                          onChange={() => toggleFinding(f.id)}
                          className="mt-0.5 rounded border-edge-secondary"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${priorityColors[f.priority] ?? priorityColors[3]}`}>
                              {priorityLabels[f.priority] ?? `P${f.priority}`}
                            </span>
                            <span className="text-xs text-content-quaternary capitalize">{f.trade}</span>
                          </div>
                          <p className="text-sm text-content-primary mt-1 line-clamp-2">{f.description}</p>
                          <p className="text-xs text-content-quaternary">{f.sectionName}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {findings.length === 0 && (
                <div className="bg-surface-secondary rounded-lg p-4 text-center">
                  <p className="text-sm text-content-quaternary">{t("onboardNoFindings")}</p>
                </div>
              )}

              <button
                onClick={() => setStep("confirm")}
                disabled={!address.trim()}
                className="w-full py-3 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-40"
              >
                {t("onboardReview")}
              </button>
            </>
          ) : step === "confirm" ? (
            <>
              {/* Confirmation summary */}
              <div className="bg-surface-secondary rounded-lg p-4 space-y-3">
                <div>
                  <p className="text-xs text-content-quaternary">{t("onboardAddress")}</p>
                  <p className="text-sm text-content-primary font-medium">{address}</p>
                </div>
                <div>
                  <p className="text-xs text-content-quaternary">{t("onboardWoCount")}</p>
                  <p className="text-sm text-content-primary font-medium">
                    {selectedIds.size} {t("onboardWorkOrders")}
                  </p>
                </div>
              </div>

              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                <p className="text-xs text-amber-400">{t("onboardWarning")}</p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep("select")}
                  disabled={isPending}
                  className="flex-1 py-3 rounded-lg text-sm font-medium bg-surface-secondary border border-edge-secondary text-content-tertiary hover:text-content-primary transition-colors"
                >
                  {t("backToProject")}
                </button>
                <button
                  onClick={handleOnboard}
                  disabled={isPending}
                  className="flex-1 py-3 rounded-lg text-sm font-semibold bg-green-600 hover:bg-green-700 text-white transition-colors disabled:opacity-50"
                >
                  {isPending ? t("onboardProcessing") : t("onboardConfirm")}
                </button>
              </div>
            </>
          ) : (
            /* Result */
            <>
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 flex items-center justify-center">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-lg font-bold text-content-primary mb-1">
                  {t("onboardSuccess")}
                </h3>
                <p className="text-sm text-content-tertiary">
                  {t("onboardCreatedWos", { count: resultWoCount })}
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="flex-1 py-3 rounded-lg text-sm font-medium bg-surface-secondary border border-edge-secondary text-content-tertiary"
                >
                  {t("onboardClose")}
                </button>
                {resultPropertyId && (
                  <button
                    onClick={() => router.push("/operate/work-orders")}
                    className="flex-1 py-3 rounded-lg text-sm font-semibold bg-green-600 text-white"
                  >
                    {t("onboardViewWos")}
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
