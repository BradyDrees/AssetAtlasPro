import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { AddUnitForm } from "@/components/unit-turn/add-unit-form";
import { UnitCard } from "@/components/unit-turn/unit-card";
import { BATCH_STATUS_LABELS } from "@/lib/unit-turn-constants";
import { updateBatch, deleteBatch } from "@/app/actions/unit-turns";
import { BatchActions } from "@/components/unit-turn/batch-actions";
import { UnitExportButtons } from "@/components/unit-turn/unit-export-buttons";

export const dynamic = "force-dynamic";

export default async function BatchDetailPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  const supabase = await createClient();

  // Fetch batch
  const { data: batch } = await supabase
    .from("unit_turn_batches")
    .select("*")
    .eq("id", batchId)
    .single();

  if (!batch) notFound();

  // Fetch units in this batch
  const { data: units } = await supabase
    .from("unit_turn_batch_units")
    .select("*")
    .eq("batch_id", batchId)
    .order("sort_order")
    .order("property")
    .order("unit_label");

  const allUnits = units ?? [];

  // Fetch item progress per unit
  let unitProgress: Record<string, { total: number; assessed: number }> = {};
  if (allUnits.length > 0) {
    const unitIds = allUnits.map((u: { id: string }) => u.id);
    const { data: items } = await supabase
      .from("unit_turn_unit_items")
      .select("unit_id, status, is_na")
      .in("unit_id", unitIds);

    if (items) {
      for (const item of items) {
        if (!unitProgress[item.unit_id]) {
          unitProgress[item.unit_id] = { total: 0, assessed: 0 };
        }
        unitProgress[item.unit_id].total++;
        if (item.status != null || item.is_na) {
          unitProgress[item.unit_id].assessed++;
        }
      }
    }
  }

  const monthLabel = batch.month
    ? new Date(batch.month + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  const statusInfo = BATCH_STATUS_LABELS[batch.status] ?? BATCH_STATUS_LABELS.OPEN;

  return (
    <div>
      {/* Header */}
      <div className="bg-gradient-to-r from-charcoal-950 via-charcoal-900 to-orange-900 -mx-4 -mt-4 md:-mx-6 md:-mt-6 px-4 py-5 md:px-6 rounded-b-xl mb-6">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-sm text-orange-300 mb-3">
          <Link href="/unit-turns" className="hover:text-white transition-colors">
            Unit Turns
          </Link>
          <span className="text-orange-500">/</span>
          <span className="text-white font-medium">{batch.name}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/unit-turns"
              className="p-1.5 text-charcoal-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-white">{batch.name}</h1>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium bg-white/20 text-white`}>
                  {statusInfo.label}
                </span>
              </div>
              {monthLabel && (
                <p className="text-orange-200 mt-1">{monthLabel}</p>
              )}
              <p className="text-sm text-orange-300/70 mt-0.5">
                {allUnits.length} unit{allUnits.length !== 1 ? "s" : ""}
              </p>
            </div>
          </div>
          <BatchActions batchId={batchId} batchStatus={batch.status} />
        </div>
      </div>

      {/* Add Unit Form */}
      {batch.status === "OPEN" && (
        <div className="mb-6">
          <AddUnitForm batchId={batchId} />
        </div>
      )}

      {/* Export Buttons */}
      {allUnits.length > 0 && (
        <div className="mb-6">
          <UnitExportButtons
            batchId={batchId}
            batchName={batch.name}
            batchLevel
          />
        </div>
      )}

      {/* Units List */}
      {allUnits.length > 0 ? (
        <div className="space-y-3">
          {allUnits.map((unit: any) => {
            const progress = unitProgress[unit.id] ?? { total: 0, assessed: 0 };
            return (
              <UnitCard
                key={unit.id}
                unit={unit}
                batchId={batchId}
                totalItems={progress.total}
                assessedItems={progress.assessed}
              />
            );
          })}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
          No units yet. Add your first unit above.
        </div>
      )}
    </div>
  );
}
