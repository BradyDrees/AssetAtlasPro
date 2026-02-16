"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ChecklistItem } from "./checklist-item";
import { createNote } from "@/app/actions/unit-turns";
import { CATEGORY_COLORS, DEFAULT_CATEGORY_COLOR } from "@/lib/unit-turn-constants";
import type { UnitTurnCategoryData } from "@/lib/unit-turn-types";

interface CategorySectionProps {
  data: UnitTurnCategoryData;
  batchId: string;
  unitId: string;
  supabaseUrl: string;
}

export function CategorySection({ data, batchId, unitId, supabaseUrl }: CategorySectionProps) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [showCatNote, setShowCatNote] = useState(false);
  const [catNoteText, setCatNoteText] = useState("");
  const [addingCatNote, setAddingCatNote] = useState(false);

  const { category, items, notes } = data;
  const colors = CATEGORY_COLORS[category.slug] ?? DEFAULT_CATEGORY_COLOR;

  // Progress: items with status set or is_na
  const assessed = items.filter((i) => i.status != null || i.is_na).length;
  const total = items.length;

  // Category-level notes (item_id is null)
  const categoryNotes = notes.filter((n) => n.item_id === null);

  const handleAddCategoryNote = async () => {
    if (!catNoteText.trim()) return;
    setAddingCatNote(true);
    await createNote(
      { unit_id: unitId, item_id: null, category_id: category.id, text: catNoteText.trim() },
      batchId
    );
    setCatNoteText("");
    setShowCatNote(false);
    setAddingCatNote(false);
    router.refresh();
  };

  return (
    <div className="scroll-mt-16">
      {/* Category Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className={`w-full flex items-center justify-between px-4 py-3 text-white rounded-t-xl transition-all shadow-sm ${colors.header}`}
      >
        <div className="flex items-center gap-2">
          <span className={`text-xs transition-transform ${collapsed ? "" : "rotate-90"}`}>▶</span>
          <h3 className="text-sm font-bold tracking-wide">{category.name}</h3>
        </div>
        <span className="text-xs text-white/70">
          {assessed}/{total}
        </span>
      </button>

      {/* Items */}
      {!collapsed && (
        <div className={`border border-t-0 ${colors.border} rounded-b-xl bg-white`}>
          {items.map((item) => (
            <ChecklistItem
              key={item.id}
              item={item}
              notes={notes.filter((n) => n.item_id === item.id)}
              categoryType={category.category_type as any}
              batchId={batchId}
              unitId={unitId}
              categoryId={category.id}
              supabaseUrl={supabaseUrl}
            />
          ))}

          {/* Category-level notes */}
          <div className="px-4 py-3 border-t border-gray-100">
            {categoryNotes.length > 0 && (
              <div className="space-y-2 mb-2">
                {categoryNotes.map((note) => (
                  <div key={note.id} className="bg-amber-50 rounded-lg p-2.5 text-sm">
                    <p className="text-gray-700">{note.text}</p>
                    <span className="text-xs text-gray-400 mt-1 block">Category note</span>
                  </div>
                ))}
              </div>
            )}

            {!showCatNote ? (
              <button
                onClick={() => setShowCatNote(true)}
                className="text-xs text-orange-600 hover:text-orange-700"
              >
                + Category Note
              </button>
            ) : (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={catNoteText}
                  onChange={(e) => setCatNoteText(e.target.value)}
                  placeholder="Category-level note..."
                  className="flex-1 px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-orange-500"
                  autoFocus
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && catNoteText.trim()) handleAddCategoryNote();
                    if (e.key === "Escape") { setShowCatNote(false); setCatNoteText(""); }
                  }}
                />
                <button
                  onClick={handleAddCategoryNote}
                  disabled={!catNoteText.trim() || addingCatNote}
                  className="px-2 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50"
                >
                  {addingCatNote ? "..." : "Add"}
                </button>
                <button
                  onClick={() => { setShowCatNote(false); setCatNoteText(""); }}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
