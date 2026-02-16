"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

interface NextTurnUnitButtonProps {
  batchId: string;
  currentUnitId: string;
}

export function NextTurnUnitButton({ batchId, currentUnitId }: NextTurnUnitButtonProps) {
  const router = useRouter();
  const [prevId, setPrevId] = useState<string | null>(null);
  const [nextId, setNextId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [missedCount, setMissedCount] = useState(0);

  const batchUrl = `/unit-turns/${batchId}`;

  useEffect(() => {
    async function fetchUnits() {
      const supabase = createClient();
      const { data: units } = await supabase
        .from("unit_turn_batch_units")
        .select("id")
        .eq("batch_id", batchId)
        .order("sort_order")
        .order("property")
        .order("unit_label");

      if (units && units.length > 0) {
        const idx = units.findIndex((u: { id: string }) => u.id === currentUnitId);
        if (idx > 0) {
          setPrevId(units[idx - 1].id);
        }
        if (idx >= 0 && idx < units.length - 1) {
          setNextId(units[idx + 1].id);
        }
      }
      setLoading(false);
    }
    fetchUnits();
  }, [batchId, currentUnitId]);

  const highlightMissed = useCallback(() => {
    // Find all unassessed items on the page
    const allItems = document.querySelectorAll("[data-assessed]");
    const missed: Element[] = [];

    allItems.forEach((el) => {
      if (el.getAttribute("data-assessed") === "false") {
        missed.push(el);
      }
      // Clear any previous highlights
      el.classList.remove("ring-2", "ring-red-400", "bg-red-50");
    });

    if (missed.length === 0) {
      return true; // All done
    }

    // Highlight all missed items
    missed.forEach((el) => {
      el.classList.add("ring-2", "ring-red-400", "bg-red-50");
    });

    // Scroll to the first missed item
    missed[0].scrollIntoView({ behavior: "smooth", block: "center" });

    setMissedCount(missed.length);

    // Auto-clear highlights after 5 seconds
    setTimeout(() => {
      missed.forEach((el) => {
        el.classList.remove("ring-2", "ring-red-400", "bg-red-50");
      });
      setMissedCount(0);
    }, 5000);

    return false; // Not done
  }, []);

  const handleNext = () => {
    const allDone = highlightMissed();
    if (allDone) {
      router.push(nextId ? `/unit-turns/${batchId}/units/${nextId}` : batchUrl);
    }
  };

  if (loading) return null;

  return (
    <div>
      {missedCount > 0 && (
        <div className="mb-3 px-4 py-2.5 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 font-medium text-center">
          {missedCount} item{missedCount !== 1 ? "s" : ""} still need{missedCount === 1 ? "s" : ""} a selection — highlighted in red above
        </div>
      )}
      <div className="flex gap-3">
        <button
          onClick={() => router.push(prevId ? `/unit-turns/${batchId}/units/${prevId}` : batchUrl)}
          className={`flex-1 py-3 text-sm font-medium rounded-lg transition-colors ${
            prevId
              ? "bg-charcoal-800 text-white hover:bg-charcoal-700"
              : "bg-charcoal-600 text-white hover:bg-charcoal-500"
          }`}
        >
          {prevId ? "← Previous Unit" : "← Batch"}
        </button>
        <button
          onClick={handleNext}
          className={`flex-1 py-3 text-sm font-medium rounded-lg transition-colors ${
            nextId
              ? "bg-brand-600 text-white hover:bg-brand-700"
              : "bg-brand-600 text-white hover:bg-brand-700"
          }`}
        >
          {nextId ? "Next Unit →" : "Batch →"}
        </button>
      </div>
    </div>
  );
}
