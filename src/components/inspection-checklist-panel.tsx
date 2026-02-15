"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createInspectionFinding } from "@/app/actions/inspection-findings";
import type {
  InspectionChecklistItem,
  InspectionFinding,
} from "@/lib/inspection-types";

interface InspectionChecklistPanelProps {
  checklistItems: InspectionChecklistItem[];
  findings: InspectionFinding[];
  projectId: string;
  projectSectionId: string;
  unitId?: string;
}

export function InspectionChecklistPanel({
  checklistItems,
  findings,
  projectId,
  projectSectionId,
  unitId,
}: InspectionChecklistPanelProps) {
  const router = useRouter();
  const [loadingItem, setLoadingItem] = useState<string | null>(null);
  const [showAddCustom, setShowAddCustom] = useState(false);
  const [customTitle, setCustomTitle] = useState("");
  const [addingCustom, setAddingCustom] = useState(false);

  // Track which checklist items already have findings
  const findingsByChecklist = new Map<string, InspectionFinding[]>();
  findings.forEach((f) => {
    if (f.checklist_item_id) {
      const list = findingsByChecklist.get(f.checklist_item_id) ?? [];
      list.push(f);
      findingsByChecklist.set(f.checklist_item_id, list);
    }
  });

  // Custom findings (no checklist_item_id)
  const customFindings = findings.filter((f) => !f.checklist_item_id);

  const handleAddFinding = async (
    checklistItemId: string | null,
    title: string
  ) => {
    if (checklistItemId) setLoadingItem(checklistItemId);
    else setAddingCustom(true);

    try {
      await createInspectionFinding({
        project_id: projectId,
        project_section_id: projectSectionId,
        checklist_item_id: checklistItemId,
        unit_id: unitId ?? null,
        title: title.trim(),
      });
      if (!checklistItemId) {
        setCustomTitle("");
        setShowAddCustom(false);
      }
      router.refresh();
    } catch (err) {
      console.error("Failed to create finding:", err);
    } finally {
      setLoadingItem(null);
      setAddingCustom(false);
    }
  };

  if (checklistItems.length === 0) return null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4 mb-6">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
        Checklist Items
      </h3>
      <div className="space-y-1">
        {checklistItems.map((item) => {
          const itemFindings = findingsByChecklist.get(item.id) ?? [];
          const hasFinding = itemFindings.length > 0;

          return (
            <div
              key={item.id}
              className="flex items-center justify-between px-3 py-2 rounded-md hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span
                  className={`w-2 h-2 rounded-full flex-shrink-0 ${
                    hasFinding ? "bg-orange-500" : "bg-gray-300"
                  }`}
                />
                <span className="text-sm text-gray-800">{item.name}</span>
                {hasFinding && (
                  <span className="text-xs text-orange-600 font-medium">
                    {itemFindings.length} finding
                    {itemFindings.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <button
                onClick={() => handleAddFinding(item.id, item.name)}
                disabled={loadingItem === item.id}
                className="text-xs px-2 py-1 text-brand-600 hover:bg-brand-50 rounded transition-colors disabled:opacity-50"
              >
                {loadingItem === item.id ? "..." : "+ Finding"}
              </button>
            </div>
          );
        })}
      </div>

      {/* Custom finding */}
      <div className="mt-3 pt-3 border-t border-gray-100">
        {showAddCustom ? (
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customTitle}
              onChange={(e) => setCustomTitle(e.target.value)}
              placeholder="Custom finding title..."
              className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-brand-500"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && customTitle.trim()) {
                  handleAddFinding(null, customTitle);
                }
                if (e.key === "Escape") {
                  setShowAddCustom(false);
                  setCustomTitle("");
                }
              }}
            />
            <button
              onClick={() => handleAddFinding(null, customTitle)}
              disabled={!customTitle.trim() || addingCustom}
              className="px-3 py-1.5 text-sm bg-brand-600 text-white rounded-md hover:bg-brand-700 disabled:opacity-50"
            >
              {addingCustom ? "..." : "Add"}
            </button>
            <button
              onClick={() => {
                setShowAddCustom(false);
                setCustomTitle("");
              }}
              className="px-2 py-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setShowAddCustom(true)}
            className="text-sm text-brand-600 hover:text-brand-800 transition-colors"
          >
            + Add Custom Finding
          </button>
        )}
      </div>
    </div>
  );
}
