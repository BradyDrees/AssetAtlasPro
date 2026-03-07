"use client";

import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  getSmartSchedulePreview,
  applySmartSchedule,
} from "@/app/actions/vendor-work-orders";
import type {
  SmartScheduleResult,
  ScheduleProposal,
} from "@/lib/vendor/smart-scheduler";

type Step = "configure" | "preview" | "applying" | "done";

const DURATION_OPTIONS = [30, 45, 60, 90, 120] as const;

function todayStr(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export interface SmartSchedulerModalProps {
  open: boolean;
  onClose: () => void;
  unscheduledCount: number;
}

export function SmartSchedulerModal({
  open,
  onClose,
  unscheduledCount,
}: SmartSchedulerModalProps) {
  const t = useTranslations("vendor.schedule.smartScheduler");
  const router = useRouter();

  const [step, setStep] = useState<Step>("configure");
  const [targetDate, setTargetDate] = useState(todayStr());
  const [duration, setDuration] = useState(60);
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<SmartScheduleResult | null>(null);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [applyProgress, setApplyProgress] = useState({ applied: 0, total: 0 });
  const [applyErrors, setApplyErrors] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setStep("configure");
    setTargetDate(todayStr());
    setDuration(60);
    setGenerating(false);
    setResult(null);
    setExcluded(new Set());
    setApplyProgress({ applied: 0, total: 0 });
    setApplyErrors([]);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  // Generate preview
  const handleGenerate = useCallback(async () => {
    setGenerating(true);
    setError(null);

    const { data, error: previewError } = await getSmartSchedulePreview(
      targetDate,
      { durationMinutes: duration }
    );

    setGenerating(false);

    if (previewError || !data) {
      setError(previewError ?? "Failed to generate preview");
      return;
    }

    if (data.proposals.length === 0 && data.unschedulable.length === 0) {
      setError(t("noJobs"));
      return;
    }

    setResult(data);
    setExcluded(new Set());
    setStep("preview");
  }, [targetDate, duration, t]);

  // Toggle a job in/out of the proposal
  const toggleJob = useCallback((jobId: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(jobId)) {
        next.delete(jobId);
      } else {
        next.add(jobId);
      }
      return next;
    });
  }, []);

  // Apply the schedule
  const handleApply = useCallback(async () => {
    if (!result) return;

    const toApply = result.proposals.filter((p) => !excluded.has(p.jobId));
    if (toApply.length === 0) return;

    setStep("applying");
    setApplyProgress({ applied: 0, total: toApply.length });

    const { applied, errors } = await applySmartSchedule(
      toApply.map((p) => ({
        jobId: p.jobId,
        scheduledDate: p.scheduledDate,
        scheduledTime: p.scheduledTime,
        endTime: p.endTime,
      }))
    );

    setApplyProgress({ applied, total: toApply.length });
    setApplyErrors(errors);
    setStep("done");
    router.refresh();
  }, [result, excluded, router]);

  if (!open) return null;

  // Active proposals (not excluded)
  const activeProposals =
    result?.proposals.filter((p) => !excluded.has(p.jobId)) ?? [];

  // Group proposals by zip for preview
  const proposalsByZip = new Map<string, ScheduleProposal[]>();
  for (const p of result?.proposals ?? []) {
    const list = proposalsByZip.get(p.zipGroup) ?? [];
    list.push(p);
    proposalsByZip.set(p.zipGroup, list);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={step === "applying" ? undefined : handleClose}
      />

      {/* Modal */}
      <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-surface-primary rounded-2xl border border-edge-primary shadow-2xl">
        {/* Header */}
        <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b border-edge-primary bg-surface-primary rounded-t-2xl z-10">
          <div className="flex items-center gap-2">
            <svg
              className="w-5 h-5 text-brand-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.455 2.456L21.75 6l-1.036.259a3.375 3.375 0 00-2.455 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z"
              />
            </svg>
            <h2 className="text-lg font-semibold text-content-primary">
              {t("title")}
            </h2>
          </div>
          {step !== "applying" && (
            <button
              onClick={handleClose}
              className="p-1.5 rounded-lg hover:bg-surface-secondary text-content-tertiary"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        <div className="p-6 space-y-5">
          {/* Error */}
          {error && (
            <div className="rounded-lg px-4 py-3 text-sm bg-red-500/10 text-red-400 border border-red-500/20">
              {error}
            </div>
          )}

          {/* === CONFIGURE STEP === */}
          {step === "configure" && (
            <>
              <p className="text-sm text-content-tertiary">
                {t("description")}
              </p>

              {/* Target date */}
              <div>
                <label className="block text-sm font-medium text-content-secondary mb-1.5">
                  {t("targetDate")}
                </label>
                <input
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                  className="w-full rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2.5 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-brand-500/40"
                />
              </div>

              {/* Duration */}
              <div>
                <label className="block text-sm font-medium text-content-secondary mb-1.5">
                  {t("duration")}
                </label>
                <div className="flex gap-2 flex-wrap">
                  {DURATION_OPTIONS.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDuration(d)}
                      className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        duration === d
                          ? "bg-brand-600 text-white"
                          : "bg-surface-secondary text-content-tertiary hover:bg-surface-tertiary"
                      }`}
                    >
                      {t(`durationOptions.${d}`)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Info */}
              <div className="rounded-lg bg-surface-secondary px-4 py-3">
                <p className="text-sm text-content-secondary">
                  {unscheduledCount > 0
                    ? `${unscheduledCount} unscheduled jobs available`
                    : t("noJobs")}
                </p>
              </div>
            </>
          )}

          {/* === PREVIEW STEP === */}
          {step === "preview" && result && (
            <>
              {/* Summary */}
              <div className="rounded-lg bg-brand-600/10 border border-brand-500/20 px-4 py-3">
                <p className="text-sm font-medium text-brand-400">
                  {t("summary", {
                    count: activeProposals.length,
                    groups: result.zipGroups.length,
                    date: targetDate,
                  })}
                </p>
              </div>

              {/* Proposals by zip group */}
              {[...proposalsByZip.entries()].map(([zip, jobs]) => (
                <div key={zip} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4 text-content-tertiary"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z"
                      />
                    </svg>
                    <h3 className="text-sm font-semibold text-content-primary">
                      {t("zipGroup", { count: jobs.length, zip })}
                    </h3>
                  </div>

                  <div className="space-y-1.5 ml-6">
                    {jobs.map((p) => {
                      const isExcluded = excluded.has(p.jobId);
                      return (
                        <div
                          key={p.jobId}
                          className={`flex items-center gap-3 rounded-lg p-2.5 transition-colors ${
                            isExcluded
                              ? "bg-surface-secondary/50 opacity-50"
                              : "bg-surface-secondary"
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={!isExcluded}
                            onChange={() => toggleJob(p.jobId)}
                            className="h-4 w-4 rounded border-edge-primary text-brand-600 focus:ring-brand-500"
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-content-primary truncate">
                              {p.title}
                            </p>
                            <p className="text-xs text-content-quaternary">
                              {p.trade} &middot; {p.scheduledTime} - {p.endTime}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${
                              p.priority === "emergency"
                                ? "bg-red-500/10 text-red-400"
                                : p.priority === "urgent"
                                  ? "bg-yellow-500/10 text-yellow-400"
                                  : "bg-surface-tertiary text-content-tertiary"
                            }`}
                          >
                            {p.priority}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}

              {/* Unschedulable */}
              {result.unschedulable.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-content-tertiary">
                    {t("unschedulable")} ({result.unschedulable.length})
                  </h3>
                  <div className="space-y-1 ml-6">
                    {result.unschedulable.map((u) => (
                      <div
                        key={u.jobId}
                        className="flex items-center justify-between rounded-lg bg-surface-secondary/50 p-2.5"
                      >
                        <p className="text-sm text-content-tertiary truncate">
                          {u.title}
                        </p>
                        <span className="text-xs text-content-quaternary shrink-0 ml-2">
                          {u.reason === "no_zip"
                            ? t("reasonNoZip")
                            : t("reasonNoTime")}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}

          {/* === APPLYING / DONE STEP === */}
          {(step === "applying" || step === "done") && (
            <div className="py-6 text-center space-y-4">
              {step === "applying" ? (
                <>
                  <div className="w-10 h-10 mx-auto rounded-full border-2 border-brand-500 border-t-transparent animate-spin" />
                  <p className="text-sm text-content-secondary">
                    {t("applying")}
                  </p>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-green-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M4.5 12.75l6 6 9-13.5"
                      />
                    </svg>
                  </div>
                  <p className="text-sm font-medium text-content-primary">
                    {t("success", { count: applyProgress.applied })}
                  </p>
                  {applyErrors.length > 0 && (
                    <p className="text-xs text-red-400">
                      {t("errors", { count: applyErrors.length })}
                    </p>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-end gap-3 px-6 py-4 border-t border-edge-primary bg-surface-primary rounded-b-2xl">
          {step === "configure" && (
            <>
              <button
                onClick={handleClose}
                className="px-4 py-2.5 rounded-lg text-sm text-content-secondary hover:bg-surface-secondary transition-colors"
              >
                {t("back")}
              </button>
              <button
                onClick={handleGenerate}
                disabled={generating || unscheduledCount === 0}
                className="px-6 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {generating ? t("generating") : t("generate")}
              </button>
            </>
          )}

          {step === "preview" && (
            <>
              <button
                onClick={() => setStep("configure")}
                className="px-4 py-2.5 rounded-lg text-sm text-content-secondary hover:bg-surface-secondary transition-colors"
              >
                {t("back")}
              </button>
              <button
                onClick={handleApply}
                disabled={activeProposals.length === 0}
                className="px-6 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium disabled:opacity-50 transition-colors"
              >
                {t("apply")} ({activeProposals.length})
              </button>
            </>
          )}

          {step === "done" && (
            <button
              onClick={handleClose}
              className="px-6 py-2.5 rounded-lg bg-brand-600 hover:bg-brand-500 text-white text-sm font-medium transition-colors"
            >
              {t("done")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
