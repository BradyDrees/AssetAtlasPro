"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  getStageTemplates,
  cloneSystemTemplate,
  deleteStageTemplate,
  updateStageTemplate,
  createStageTemplate,
} from "@/app/actions/operate-projects";
import type { StageTemplate, StageTemplateStage, ProjectType } from "@/app/actions/operate-projects";

interface TemplateManagerProps {
  initialTemplates: StageTemplate[];
  messages: Record<string, unknown>;
}

function createT(messages: Record<string, unknown>) {
  return (key: string, params?: Record<string, string | number>): string => {
    const parts = key.split(".");
    let val: unknown = messages;
    for (const p of parts) {
      if (val && typeof val === "object") val = (val as Record<string, unknown>)[p];
      else return key;
    }
    let result = typeof val === "string" ? val : key;
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        result = result.replace(`{${k}}`, String(v));
      }
    }
    return result;
  };
}

const TYPE_LABELS: Record<string, string> = {
  unit_turn: "Unit Turn",
  renovation: "Renovation",
  capital: "Capital Project",
  seasonal: "Seasonal",
  custom: "Custom",
};

export function TemplateManager({ initialTemplates, messages }: TemplateManagerProps) {
  const t = createT(messages);
  const router = useRouter();
  const [templates, setTemplates] = useState(initialTemplates);
  const [isPending, startTransition] = useTransition();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editStages, setEditStages] = useState<StageTemplateStage[]>([]);
  const [editName, setEditName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newType, setNewType] = useState<ProjectType>("custom");
  const [newStages, setNewStages] = useState<StageTemplateStage[]>([]);
  const [newStageName, setNewStageName] = useState("");

  const refresh = () => {
    startTransition(async () => {
      const { data } = await getStageTemplates();
      setTemplates(data);
    });
  };

  const handleClone = (templateId: string, originalName: string) => {
    startTransition(async () => {
      await cloneSystemTemplate(templateId, `${originalName} (Copy)`);
      refresh();
    });
  };

  const handleDelete = (templateId: string) => {
    startTransition(async () => {
      await deleteStageTemplate(templateId);
      refresh();
    });
  };

  const startEdit = (template: StageTemplate) => {
    setEditingId(template.id);
    setEditName(template.name);
    setEditStages([...(template.stages ?? [])]);
  };

  const saveEdit = () => {
    if (!editingId) return;
    startTransition(async () => {
      await updateStageTemplate(editingId, { name: editName, stages: editStages });
      setEditingId(null);
      refresh();
    });
  };

  const addNewStage = () => {
    if (!newStageName.trim()) return;
    setNewStages([
      ...newStages,
      { name: newStageName.trim(), sort_order: newStages.length, default_tasks: [] },
    ]);
    setNewStageName("");
  };

  const handleCreate = () => {
    if (!newName.trim()) return;
    startTransition(async () => {
      await createStageTemplate({ project_type: newType, name: newName, stages: newStages });
      setShowCreate(false);
      setNewName("");
      setNewType("custom");
      setNewStages([]);
      refresh();
    });
  };

  const systemTemplates = templates.filter((t) => !t.pm_user_id);
  const customTemplates = templates.filter((t) => t.pm_user_id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link
            href="/operate/projects"
            className="text-content-quaternary hover:text-content-secondary text-sm mb-2 inline-flex items-center gap-1"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {t("detail.backToProjects")}
          </Link>
          <h1 className="text-content-primary text-xl font-bold">Stage Templates</h1>
          <p className="text-content-tertiary text-sm">
            Customize pipeline templates for your projects
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 text-white text-sm font-medium transition-colors"
        >
          New Template
        </button>
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-surface-secondary border border-edge-primary rounded-xl p-5 space-y-4">
          <h3 className="text-content-primary font-semibold">New Template</h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-content-secondary text-sm mb-1">Name</label>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Quick Turn Pipeline"
                className="w-full px-3 py-2 rounded-lg bg-surface-primary border border-edge-primary text-content-primary placeholder:text-content-quaternary text-sm focus:outline-none focus:ring-2 focus:ring-green-500/40"
              />
            </div>
            <div>
              <label className="block text-content-secondary text-sm mb-1">Type</label>
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value as ProjectType)}
                className="w-full px-3 py-2 rounded-lg bg-surface-primary border border-edge-primary text-content-secondary text-sm"
              >
                {Object.entries(TYPE_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Stages */}
          <div>
            <label className="block text-content-secondary text-sm mb-2">Stages</label>
            {newStages.map((s, i) => (
              <div key={i} className="flex items-center gap-2 mb-1.5">
                <span className="text-content-quaternary text-xs w-6">{i + 1}.</span>
                <span className="text-content-primary text-sm">{s.name}</span>
                <button
                  onClick={() => setNewStages(newStages.filter((_, j) => j !== i))}
                  className="ml-auto text-content-quaternary hover:text-red-400 text-xs"
                >
                  Remove
                </button>
              </div>
            ))}
            <div className="flex gap-2 mt-2">
              <input
                value={newStageName}
                onChange={(e) => setNewStageName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && addNewStage()}
                placeholder="Stage name..."
                className="flex-1 px-3 py-1.5 rounded-lg bg-surface-primary border border-edge-primary text-content-primary placeholder:text-content-quaternary text-sm focus:outline-none focus:ring-2 focus:ring-green-500/40"
              />
              <button
                onClick={addNewStage}
                className="px-3 py-1.5 rounded-lg bg-surface-tertiary text-content-secondary text-sm hover:bg-surface-primary transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          <div className="flex gap-2 justify-end">
            <button
              onClick={() => { setShowCreate(false); setNewStages([]); setNewName(""); }}
              className="px-4 py-2 rounded-lg border border-edge-primary text-content-secondary text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isPending || !newName.trim()}
              className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium transition-colors"
            >
              Create Template
            </button>
          </div>
        </div>
      )}

      {/* System defaults */}
      <div>
        <h2 className="text-content-secondary font-medium text-sm mb-3">System Defaults</h2>
        <div className="space-y-3">
          {systemTemplates.map((tmpl) => (
            <div
              key={tmpl.id}
              className="bg-surface-secondary border border-edge-primary rounded-xl p-4"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-content-primary font-medium">{tmpl.name}</h3>
                  <p className="text-content-quaternary text-xs">
                    {t(`projectTypes.${tmpl.project_type}`)} &middot; {(tmpl.stages ?? []).length} stages
                  </p>
                </div>
                <button
                  onClick={() => handleClone(tmpl.id, tmpl.name)}
                  disabled={isPending}
                  className="px-3 py-1.5 rounded-lg border border-edge-primary text-content-secondary hover:bg-surface-tertiary text-sm transition-colors"
                >
                  Clone &amp; Customize
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {(tmpl.stages ?? []).map((s, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-surface-tertiary text-content-tertiary text-xs">
                    {s.name}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Custom templates */}
      {customTemplates.length > 0 && (
        <div>
          <h2 className="text-content-secondary font-medium text-sm mb-3">Your Templates</h2>
          <div className="space-y-3">
            {customTemplates.map((tmpl) => (
              <div
                key={tmpl.id}
                className="bg-surface-secondary border border-edge-primary rounded-xl p-4"
              >
                {editingId === tmpl.id ? (
                  /* Edit mode */
                  <div className="space-y-3">
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-surface-primary border border-edge-primary text-content-primary text-sm focus:outline-none focus:ring-2 focus:ring-green-500/40"
                    />
                    {editStages.map((s, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="text-content-quaternary text-xs w-6">{i + 1}.</span>
                        <input
                          value={s.name}
                          onChange={(e) => {
                            const updated = [...editStages];
                            updated[i] = { ...s, name: e.target.value };
                            setEditStages(updated);
                          }}
                          className="flex-1 px-2 py-1 rounded bg-surface-primary border border-edge-primary text-content-primary text-sm"
                        />
                        <button
                          onClick={() => setEditStages(editStages.filter((_, j) => j !== i))}
                          className="text-content-quaternary hover:text-red-400 text-xs"
                        >
                          &times;
                        </button>
                      </div>
                    ))}
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => setEditingId(null)} className="px-3 py-1.5 rounded-lg border border-edge-primary text-content-secondary text-sm">
                        Cancel
                      </button>
                      <button onClick={saveEdit} disabled={isPending} className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-sm font-medium">
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <>
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-content-primary font-medium">{tmpl.name}</h3>
                        <p className="text-content-quaternary text-xs">
                          {t(`projectTypes.${tmpl.project_type}`)} &middot; {(tmpl.stages ?? []).length} stages
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => startEdit(tmpl)}
                          className="px-3 py-1.5 rounded-lg border border-edge-primary text-content-secondary hover:bg-surface-tertiary text-sm transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(tmpl.id)}
                          disabled={isPending}
                          className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 hover:bg-red-500/10 text-sm transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {(tmpl.stages ?? []).map((s, i) => (
                        <span key={i} className="px-2 py-0.5 rounded bg-surface-tertiary text-content-tertiary text-xs">
                          {s.name}
                        </span>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
