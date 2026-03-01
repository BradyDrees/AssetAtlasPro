"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { submitProject } from "@/app/actions/home-projects";

type Trade = "plumbing" | "electrical" | "hvac" | "appliance" | "general" | "structural" | "pest" | "cleaning" | "landscaping" | "demolition" | "drywall" | "painting" | "tile_flooring" | "carpentry" | "concrete" | "windows_doors" | "appliance_install" | "other";

const ALL_TRADES: Trade[] = [
  "demolition", "plumbing", "electrical", "hvac", "drywall", "tile_flooring",
  "painting", "carpentry", "concrete", "cleaning", "landscaping", "structural",
  "windows_doors", "appliance_install", "appliance", "pest", "general", "other",
];

interface TemplateData {
  id: string;
  name: string;
  display_name: string;
  description: string | null;
  trades: Array<{ order: number; trade: string; scope: string; depends_on: number[] }>;
  avg_duration_days: number | null;
  avg_cost_low: number | null;
  avg_cost_high: number | null;
}

interface TradeEntry {
  trade: string;
  scope: string;
  sequence_order: number;
  depends_on: number[];
}

interface NewProjectWizardProps {
  propertyId: string;
  propertyAddress: string;
  templates: TemplateData[];
}

export function NewProjectWizard({ propertyId, propertyAddress }: NewProjectWizardProps & { templates: TemplateData[] }) {
  const t = useTranslations("home.projects");
  const wt = useTranslations("home.workOrders");
  const router = useRouter();
  const [step, setStep] = useState(1);
  const totalSteps = 3;

  // Step 1: Title + description
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");

  // Step 2: Trades
  const [mode, setMode] = useState<"template" | "custom" | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateData | null>(null);
  const [trades, setTrades] = useState<TradeEntry[]>([]);
  const [estimatedDuration, setEstimatedDuration] = useState<number | null>(null);
  const [estimatedCostLow, setEstimatedCostLow] = useState<number | null>(null);
  const [estimatedCostHigh, setEstimatedCostHigh] = useState<number | null>(null);

  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Access templates from props via closure
  const { templates } = arguments[0] as NewProjectWizardProps & { templates: TemplateData[] };

  const canNext = () => {
    if (step === 1) return title.trim().length > 2;
    if (step === 2) return trades.length > 0 && trades.every((t) => t.trade && t.scope.trim().length > 0);
    return true;
  };

  const applyTemplate = (tmpl: TemplateData) => {
    setSelectedTemplate(tmpl);
    setTrades(
      tmpl.trades.map((t) => ({
        trade: t.trade,
        scope: t.scope,
        sequence_order: t.order,
        depends_on: t.depends_on,
      }))
    );
    setEstimatedDuration(tmpl.avg_duration_days);
    setEstimatedCostLow(tmpl.avg_cost_low);
    setEstimatedCostHigh(tmpl.avg_cost_high);
  };

  const addTrade = () => {
    const nextOrder = trades.length > 0 ? Math.max(...trades.map((t) => t.sequence_order)) + 1 : 1;
    setTrades([...trades, { trade: "", scope: "", sequence_order: nextOrder, depends_on: [] }]);
  };

  const removeTrade = (idx: number) => {
    setTrades(trades.filter((_, i) => i !== idx));
  };

  const updateTrade = (idx: number, field: keyof TradeEntry, value: unknown) => {
    setTrades(trades.map((t, i) => (i === idx ? { ...t, [field]: value } : t)));
  };

  const handleSubmit = () => {
    startTransition(async () => {
      setError(null);
      const result = await submitProject({
        title,
        description,
        property_id: propertyId,
        template_name: selectedTemplate?.name ?? undefined,
        trades,
        estimated_duration_days: estimatedDuration ?? undefined,
        estimated_cost_low: estimatedCostLow ?? undefined,
        estimated_cost_high: estimatedCostHigh ?? undefined,
      });

      if (result.success && result.id) {
        router.push(`/home/projects/${result.id}`);
      } else {
        setError(result.error ?? "Something went wrong");
      }
    });
  };

  const tradeLabel = (trade: string) => {
    try {
      return wt(trade as Parameters<typeof wt>[0]);
    } catch {
      return trade.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      {/* Progress */}
      <div className="mb-6">
        <div className="flex items-center justify-between text-sm text-content-tertiary mb-2">
          <button
            onClick={() => step > 1 && setStep(step - 1)}
            className={step > 1 ? "text-rose-600 font-medium" : "invisible"}
          >
            {t("back")}
          </button>
          <span>{t("stepOf", { current: step, total: totalSteps })}</span>
          <div className="w-12" />
        </div>
        <div className="w-full bg-surface-secondary rounded-full h-1.5">
          <div
            className="bg-rose-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
      </div>

      {/* Step 1: Title + Description */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-bold text-content-primary mb-1">
              {t("createProject")}
            </h2>
            <p className="text-sm text-content-tertiary">{propertyAddress}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-content-secondary mb-1.5">
              {t("projectTitle")}
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t("projectTitlePlaceholder")}
              className="w-full px-3 py-2.5 bg-surface-primary border border-edge-primary rounded-lg text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-content-secondary mb-1.5">
              {t("projectDescription")}
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("projectDescriptionPlaceholder")}
              rows={4}
              className="w-full px-3 py-2.5 bg-surface-primary border border-edge-primary rounded-lg text-content-primary placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-rose-500/50 focus:border-rose-500 resize-none"
            />
          </div>
        </div>
      )}

      {/* Step 2: Trade Selection */}
      {step === 2 && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-content-primary">
            {t("tradeSequence")}
          </h2>
          <p className="text-sm text-content-tertiary">{t("tradeSequenceDesc")}</p>

          {/* Mode selector (only if no trades yet) */}
          {trades.length === 0 && !mode && (
            <div className="grid grid-cols-1 gap-3">
              <button
                onClick={() => setMode("template")}
                className="p-4 border border-edge-primary rounded-xl text-left hover:border-rose-300 hover:bg-rose-50/50 transition-colors"
              >
                <p className="font-medium text-content-primary">{t("chooseTemplate")}</p>
                <p className="text-sm text-content-tertiary mt-0.5">
                  {t("chooseTemplateDesc")}
                </p>
              </button>
              <button
                onClick={() => {
                  setMode("custom");
                  addTrade();
                }}
                className="p-4 border border-edge-primary rounded-xl text-left hover:border-rose-300 hover:bg-rose-50/50 transition-colors"
              >
                <p className="font-medium text-content-primary">{t("buildCustom")}</p>
                <p className="text-sm text-content-tertiary mt-0.5">
                  {t("buildCustomDesc")}
                </p>
              </button>
            </div>
          )}

          {/* Template picker */}
          {mode === "template" && trades.length === 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-content-secondary">
                {t("selectTemplate")}
              </h3>
              {templates.map((tmpl) => (
                <button
                  key={tmpl.id}
                  onClick={() => applyTemplate(tmpl)}
                  className="w-full p-4 border border-edge-primary rounded-xl text-left hover:border-rose-300 hover:bg-rose-50/50 transition-colors"
                >
                  <p className="font-medium text-content-primary">{tmpl.display_name}</p>
                  <p className="text-sm text-content-tertiary mt-0.5">{tmpl.description}</p>
                  <div className="flex gap-3 mt-2 text-xs text-content-quaternary">
                    {tmpl.avg_duration_days && (
                      <span>{t("avgDuration", { days: tmpl.avg_duration_days })}</span>
                    )}
                    {tmpl.avg_cost_low && tmpl.avg_cost_high && (
                      <span>
                        ${tmpl.avg_cost_low.toLocaleString()} - ${tmpl.avg_cost_high.toLocaleString()}
                      </span>
                    )}
                    <span>{tmpl.trades.length} trades</span>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Trade list editor */}
          {trades.length > 0 && (
            <div className="space-y-4">
              {selectedTemplate && (
                <div className="px-3 py-2 bg-rose-50 border border-rose-200 rounded-lg text-sm text-rose-700">
                  {t("templateSelected")}: {selectedTemplate.display_name}
                </div>
              )}

              {trades.map((entry, idx) => (
                <div
                  key={idx}
                  className="bg-surface-primary border border-edge-primary rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-content-secondary">
                      {t("step", { num: entry.sequence_order })}
                    </span>
                    <button
                      onClick={() => removeTrade(idx)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      {t("removeTrade")}
                    </button>
                  </div>

                  {/* Trade type */}
                  <select
                    value={entry.trade}
                    onChange={(e) => updateTrade(idx, "trade", e.target.value)}
                    className="w-full px-3 py-2 bg-surface-primary border border-edge-primary rounded-lg text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/50"
                  >
                    <option value="">{t("selectTrade")}</option>
                    {ALL_TRADES.map((tr) => (
                      <option key={tr} value={tr}>
                        {tradeLabel(tr)}
                      </option>
                    ))}
                  </select>

                  {/* Scope */}
                  <textarea
                    value={entry.scope}
                    onChange={(e) => updateTrade(idx, "scope", e.target.value)}
                    placeholder={t("scopePlaceholder")}
                    rows={2}
                    className="w-full px-3 py-2 bg-surface-primary border border-edge-primary rounded-lg text-content-primary text-sm placeholder:text-content-quaternary focus:outline-none focus:ring-2 focus:ring-rose-500/50 resize-none"
                  />

                  {/* Dependencies */}
                  <div>
                    <label className="block text-xs font-medium text-content-tertiary mb-1">
                      {t("dependsOn")}
                    </label>
                    {trades.filter((_, i) => i !== idx).length === 0 ? (
                      <p className="text-xs text-content-quaternary">{t("noDependencies")}</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {trades
                          .filter((_, i) => i !== idx)
                          .map((other) => {
                            const isSelected = entry.depends_on.includes(other.sequence_order);
                            return (
                              <button
                                key={other.sequence_order}
                                type="button"
                                onClick={() => {
                                  const newDeps = isSelected
                                    ? entry.depends_on.filter((d) => d !== other.sequence_order)
                                    : [...entry.depends_on, other.sequence_order];
                                  updateTrade(idx, "depends_on", newDeps);
                                }}
                                className={`px-2 py-1 text-xs rounded-md border transition-colors ${
                                  isSelected
                                    ? "bg-rose-100 border-rose-300 text-rose-700"
                                    : "border-edge-primary text-content-tertiary hover:border-rose-300"
                                }`}
                              >
                                #{other.sequence_order} {tradeLabel(other.trade) || "..."}
                              </button>
                            );
                          })}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              <button
                onClick={addTrade}
                className="w-full py-2.5 border-2 border-dashed border-edge-secondary rounded-xl text-sm text-content-tertiary hover:border-rose-300 hover:text-rose-600 transition-colors"
              >
                + {t("addTrade")}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Step 3: Review & Submit */}
      {step === 3 && (
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-content-primary">
            {t("reviewSubmit")}
          </h2>

          {/* Summary card */}
          <div className="bg-surface-primary border border-edge-primary rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-content-primary">{title}</h3>
            {description && (
              <p className="text-sm text-content-tertiary">{description}</p>
            )}
            <div className="flex flex-wrap gap-4 text-sm text-content-tertiary">
              <span>{t("tradeSummary", { count: trades.length })}</span>
              {estimatedDuration && (
                <span>{t("estimatedDuration")}: {t("days", { count: estimatedDuration })}</span>
              )}
            </div>
            {estimatedCostLow && estimatedCostHigh && (
              <p className="text-sm text-content-tertiary">
                {t("estimatedCost")}: ${estimatedCostLow.toLocaleString()} - ${estimatedCostHigh.toLocaleString()}
              </p>
            )}
          </div>

          {/* Trade sequence preview */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-content-secondary">
              {t("tradeSequence")}
            </h3>
            {trades.map((entry, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 bg-surface-primary border border-edge-primary rounded-lg p-3"
              >
                <div className="w-7 h-7 bg-rose-100 text-rose-700 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {entry.sequence_order}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-content-primary">
                    {tradeLabel(entry.trade)}
                  </p>
                  <p className="text-xs text-content-tertiary mt-0.5 line-clamp-2">
                    {entry.scope}
                  </p>
                  {entry.depends_on.length > 0 && (
                    <p className="text-xs text-content-quaternary mt-1">
                      {t("dependsOn")}: {entry.depends_on.map((d) => `#${d}`).join(", ")}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
        </div>
      )}

      {/* Navigation buttons */}
      <div className="mt-8">
        {step < totalSteps ? (
          <button
            onClick={() => canNext() && setStep(step + 1)}
            disabled={!canNext()}
            className="w-full py-3 bg-rose-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-rose-700 transition-colors"
          >
            {t("next")}
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="w-full py-3 bg-rose-600 text-white rounded-xl text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-rose-700 transition-colors"
          >
            {isPending ? t("submitting") : t("submit")}
          </button>
        )}
      </div>
    </div>
  );
}
