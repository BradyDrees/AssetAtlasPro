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

      if (units && units.length > 1) {
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

  if (loading || (!prevId && !nextId)) return null;

  return (
    <div className="flex gap-3">
      {prevId ? (
        <button
          onClick={() => router.push(`/unit-turns/${batchId}/units/${prevId}`)}
          className="flex-1 py-3 bg-charcoal-800 text-white text-sm font-medium rounded-lg hover:bg-charcoal-700 transition-colors"
        >
          ← Previous Unit
        </button>
      ) : (
        <div className="flex-1" />
      )}
      {nextId ? (
        <button
          onClick={() => router.push(`/unit-turns/${batchId}/units/${nextId}`)}
          className="flex-1 py-3 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 transition-colors"
        >
          Next Unit →
        </button>
      ) : (
        <div className="flex-1" />
      )}
    </div>
  );
}
