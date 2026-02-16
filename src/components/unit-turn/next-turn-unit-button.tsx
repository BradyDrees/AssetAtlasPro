"use client";

import { useState, useEffect } from "react";
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

  if (loading) return null;

  return (
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
        onClick={() => router.push(nextId ? `/unit-turns/${batchId}/units/${nextId}` : batchUrl)}
        className={`flex-1 py-3 text-sm font-medium rounded-lg transition-colors ${
          nextId
            ? "bg-orange-600 text-white hover:bg-orange-700"
            : "bg-orange-600 text-white hover:bg-orange-700"
        }`}
      >
        {nextId ? "Next Unit →" : "Batch →"}
      </button>
    </div>
  );
}
