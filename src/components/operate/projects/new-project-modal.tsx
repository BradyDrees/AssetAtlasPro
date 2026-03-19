"use client";

import { useState, useTransition } from "react";
import type {
  ProjectType,
  StageTemplate,
  CreateProjectInput,
} from "@/app/actions/operate-projects";
import { createOperateProject } from "@/app/actions/operate-projects";

type TFn = (key: string, values?: Record<string, string | number>) => string;

interface NewProjectModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
  templates: StageTemplate[];
  t: TFn;
}

// -----------------------------------------------
// Project type icon + config
// -----------------------------------------------
const TYPE_META: Record<
  ProjectType,
  { icon: React.ReactNode; color: string }
> = {
  unit_turn: {
    color: "border-green-500/40 hover:border-green-500",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" />
      </svg>
    ),
  },
  renovation: {
    color: "border-blue-500/40 hover:border-blue-500",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />
      </svg>
    ),
  },
  capital: {
    color: "border-amber-500/40 hover:border-amber-500",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 21h19.5m-18-18v18m10.5-18v18m6-13.5V21M6.75 6.75h.75m-.75 3h.75m-.75 3h.75m3-6h.75m-.75 3h.75m-.75 3h.75M6.75 21v-3.375c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21M3 3h12m-.75 4.5H21m-3.75 3H21m-3.75 3H21" />
      </svg>
    ),
  },
  seasonal: {
    color: "border-cyan-500/40 hover:border-cyan-500",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />
      </svg>
    ),
  },
  custom: {
    color: "border-purple-500/40 hover:border-purple-500",
    icon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
};

const PROJECT_TYPES: ProjectType[] = [
  "unit_turn",
  "renovation",
  "capital",
  "seasonal",
  "custom",
];

// -----------------------------------------------
// Component
// -----------------------------------------------
export function NewProjectModal({
  open,
  onClose,
  onCreated,
  templates,
  t,
}: NewProjectModalProps) {
  const [step, setStep] = useState(1);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [projectType, setProjectType] = useState<ProjectType>("unit_turn");
  const [title, setTitle] = useState("");
  const [propertyName, setPropertyName] = useState("");
  const [propertyAddress, setPropertyAddress] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [moveInDate, setMoveInDate] = useState("");
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");

  // Selected template (auto-pick default for the type)
  const matchingTemplates = templates.filter(
    (tmpl) => tmpl.project_type === projectType
  );
  const defaultTemplate =
    matchingTemplates.find((tmpl) => tmpl.is_default) ??
    matchingTemplates[0] ??
    null;
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    defaultTemplate?.id ?? null
  );

  // Recompute template when type changes
  const selectedTemplate =
    templates.find((tmpl) => tmpl.id === selectedTemplateId) ??
    defaultTemplate;

  const reviewStages = selectedTemplate?.stages ?? [];

  // Reset when type changes
  const handleTypeSelect = (type: ProjectType) => {
    setProjectType(type);
    const matches = templates.filter((tmpl) => tmpl.project_type === type);
    const def = matches.find((tmpl) => tmpl.is_default) ?? matches[0] ?? null;
    setSelectedTemplateId(def?.id ?? null);
  };

  const resetForm = () => {
    setStep(1);
    setProjectType("unit_turn");
    setTitle("");
    setPropertyName("");
    setPropertyAddress("");
    setUnitNumber("");
    setDueDate("");
    setMoveInDate("");
    setBudget("");
    setNotes("");
    setError(null);
    const matches = templates.filter(
      (tmpl) => tmpl.project_type === "unit_turn"
    );
    const def = matches.find((tmpl) => tmpl.is_default) ?? matches[0] ?? null;
    setSelectedTemplateId(def?.id ?? null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    if (!selectedTemplate) return;

    setError(null);
    startTransition(async () => {
      const input: CreateProjectInput = {
        project_type: projectType,
        template_id: selectedTemplate.id,
        title: title.trim(),
        property_name: propertyName.trim() || undefined,
        property_address: propertyAddress.trim() || undefined,
        unit_number: unitNumber.trim() || undefined,
        due_date: dueDate || undefined,
        move_in_date: moveInDate || undefined,
        total_budget: budget ? Number(budget) : undefined,
        notes: notes.trim() || undefined,
      };

      const result = await createOperateProject(input);
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.data) {
        resetForm();
        onCreated(result.data.id);
      }
    });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative bg-surface-primary rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-green-800 to-green-600 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-white">
              {t("create.title")}
            </h2>
            <p className="text-xs text-green-200 mt-0.5">
              {step === 1
                ? t("create.step1Subtitle")
                : step === 2
                  ? t("create.step2Subtitle")
                  : t("create.step3Subtitle")}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-11 h-11 flex items-center justify-center text-green-300 hover:text-white transition-colors -mr-2"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center gap-1 px-6 pt-4 pb-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`flex-1 h-1 rounded-full transition-colors ${
                s <= step ? "bg-green-500" : "bg-surface-tertiary"
              }`}
            />
          ))}
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {/* Step 1: Type Selector */}
          {step === 1 && (
            <div className="space-y-3">
              <p className="text-sm font-semibold text-content-primary mb-4">
                {t("create.step1Title")}
              </p>
              <div className="grid grid-cols-2 gap-3">
                {PROJECT_TYPES.map((pt) => {
                  const meta = TYPE_META[pt];
                  const isSelected = pt === projectType;
                  return (
                    <button
                      key={pt}
                      type="button"
                      onClick={() => handleTypeSelect(pt)}
                      className={`
                        flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center
                        ${
                          isSelected
                            ? "border-green-500 bg-green-500/10"
                            : `border-edge-secondary bg-surface-secondary ${meta.color}`
                        }
                      `}
                    >
                      <div
                        className={`${isSelected ? "text-green-400" : "text-content-tertiary"}`}
                      >
                        {meta.icon}
                      </div>
                      <span
                        className={`text-xs font-medium ${
                          isSelected
                            ? "text-green-400"
                            : "text-content-secondary"
                        }`}
                      >
                        {t(`projectTypes.${pt}`)}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Details Form */}
          {step === 2 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-content-primary mb-2">
                {t("create.step2Title")}
              </p>

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-content-secondary mb-1">
                  {t("create.projectTitle")}
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t("create.projectTitlePlaceholder")}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-surface-secondary border border-edge-secondary text-content-primary placeholder:text-content-quaternary focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30"
                />
              </div>

              {/* Property Name */}
              <div>
                <label className="block text-xs font-medium text-content-secondary mb-1">
                  {t("create.propertyName")}
                </label>
                <input
                  type="text"
                  value={propertyName}
                  onChange={(e) => setPropertyName(e.target.value)}
                  placeholder={t("create.propertyNamePlaceholder")}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-surface-secondary border border-edge-secondary text-content-primary placeholder:text-content-quaternary focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30"
                />
              </div>

              {/* Property Address */}
              <div>
                <label className="block text-xs font-medium text-content-secondary mb-1">
                  {t("create.propertyAddress")}
                </label>
                <input
                  type="text"
                  value={propertyAddress}
                  onChange={(e) => setPropertyAddress(e.target.value)}
                  placeholder={t("create.propertyAddressPlaceholder")}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-surface-secondary border border-edge-secondary text-content-primary placeholder:text-content-quaternary focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30"
                />
              </div>

              {/* Unit + Dates row */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-content-secondary mb-1">
                    {t("create.unitNumber")}
                  </label>
                  <input
                    type="text"
                    value={unitNumber}
                    onChange={(e) => setUnitNumber(e.target.value)}
                    placeholder={t("create.unitNumberPlaceholder")}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-surface-secondary border border-edge-secondary text-content-primary placeholder:text-content-quaternary focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-content-secondary mb-1">
                    {t("create.budget")}
                  </label>
                  <input
                    type="number"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                    placeholder={t("create.budgetPlaceholder")}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-surface-secondary border border-edge-secondary text-content-primary placeholder:text-content-quaternary focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30"
                  />
                </div>
              </div>

              {/* Due Date + Move-in Date */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-content-secondary mb-1">
                    {t("create.dueDate")}
                  </label>
                  <input
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-surface-secondary border border-edge-secondary text-content-primary focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-content-secondary mb-1">
                    {t("create.moveInDate")}
                  </label>
                  <input
                    type="date"
                    value={moveInDate}
                    onChange={(e) => setMoveInDate(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg bg-surface-secondary border border-edge-secondary text-content-primary focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30"
                  />
                </div>
              </div>

              {/* Template selector */}
              {matchingTemplates.length > 1 && (
                <div>
                  <label className="block text-xs font-medium text-content-secondary mb-1">
                    {t("create.template")}
                  </label>
                  <select
                    value={selectedTemplateId ?? ""}
                    onChange={(e) =>
                      setSelectedTemplateId(e.target.value || null)
                    }
                    className="w-full px-3 py-2 text-sm rounded-lg bg-surface-secondary border border-edge-secondary text-content-primary focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30"
                  >
                    {matchingTemplates.map((tmpl) => (
                      <option key={tmpl.id} value={tmpl.id}>
                        {tmpl.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-content-secondary mb-1">
                  {t("create.notes")}
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t("create.notesPlaceholder")}
                  rows={3}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-surface-secondary border border-edge-secondary text-content-primary placeholder:text-content-quaternary focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/30 resize-none"
                />
              </div>
            </div>
          )}

          {/* Step 3: Review Stages */}
          {step === 3 && (
            <div className="space-y-4">
              <p className="text-sm font-semibold text-content-primary mb-2">
                {t("create.step3Title")}
              </p>
              <p className="text-xs text-content-tertiary">
                {t("create.step3Subtitle")}
              </p>

              {reviewStages.length === 0 ? (
                <p className="text-xs text-content-quaternary py-4 text-center">
                  {t("create.noStages")}
                </p>
              ) : (
                <div className="space-y-2">
                  <p className="text-[10px] text-content-quaternary">
                    {t("create.stagesFromTemplate", {
                      count: reviewStages.length,
                    })}
                  </p>
                  {reviewStages
                    .sort((a, b) => a.sort_order - b.sort_order)
                    .map((stage, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-3 p-3 rounded-lg bg-surface-secondary border border-edge-secondary"
                      >
                        <span className="w-6 h-6 flex items-center justify-center rounded-full bg-green-500/15 text-green-400 text-[10px] font-bold shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-content-primary font-medium truncate">
                            {stage.name}
                          </p>
                          {stage.default_tasks.length > 0 && (
                            <p className="text-[10px] text-content-quaternary mt-0.5">
                              {t("card.tasks", {
                                done: 0,
                                total: stage.default_tasks.length,
                              })}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* Summary */}
              <div className="mt-4 p-3 rounded-lg bg-surface-secondary border border-edge-secondary space-y-1">
                <p className="text-xs text-content-secondary">
                  <span className="font-medium text-content-primary">
                    {title}
                  </span>
                </p>
                {propertyName && (
                  <p className="text-[10px] text-content-quaternary">
                    {propertyName}
                    {unitNumber ? ` / ${unitNumber}` : ""}
                  </p>
                )}
                <p className="text-[10px] text-content-quaternary">
                  {t(`projectTypes.${projectType}`)}
                  {budget ? ` — $${Number(budget).toLocaleString()}` : ""}
                </p>
              </div>

              {error && (
                <p className="text-xs text-red-400 mt-2">{error}</p>
              )}
            </div>
          )}
        </div>

        {/* Footer nav buttons */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-t border-edge-primary flex-shrink-0">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="text-sm text-content-tertiary hover:text-content-primary transition-colors"
            >
              {t("create.back")}
            </button>
          ) : (
            <span />
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              disabled={step === 2 && !title.trim()}
              className="text-sm font-medium px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t("create.next")}
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isPending || !title.trim() || !selectedTemplate}
              className="text-sm font-medium px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? t("create.creating") : t("create.create")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
