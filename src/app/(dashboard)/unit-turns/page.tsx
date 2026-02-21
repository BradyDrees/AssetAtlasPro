import { createClient } from "@/lib/supabase/server";
import { getTranslations } from "next-intl/server";
import { CreateBatchButton } from "@/components/unit-turn/create-batch-button";
import { BatchCard } from "@/components/unit-turn/batch-card";

export const dynamic = "force-dynamic";

export default async function UnitTurnsPage() {
  const supabase = await createClient();
  const t = await getTranslations();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch batches owned by current user
  const { data: batches } = await supabase
    .from("unit_turn_batches")
    .select("*")
    .eq("owner_id", user?.id ?? "")
    .order("created_at", { ascending: false });

  // Fetch unit counts per batch
  const batchIds = (batches ?? []).map((b: { id: string }) => b.id);
  let unitCounts: Record<string, number> = {};

  if (batchIds.length > 0) {
    const { data: units } = await supabase
      .from("unit_turn_batch_units")
      .select("batch_id")
      .in("batch_id", batchIds);

    if (units) {
      for (const u of units) {
        unitCounts[u.batch_id] = (unitCounts[u.batch_id] || 0) + 1;
      }
    }
  }

  const openBatches = (batches ?? []).filter((b: { status: string }) => b.status === "OPEN");
  const closedBatches = (batches ?? []).filter((b: { status: string }) => b.status === "CLOSED");
  const hasAny = (batches ?? []).length > 0;

  return (
    <div>
      {/* Page header */}
      <div className="flex items-center justify-between mb-6 bg-[radial-gradient(ellipse_at_top_left,_var(--brand-900)_0%,_transparent_50%),radial-gradient(ellipse_at_bottom_right,_var(--brand-900)_0%,_var(--charcoal-950)_60%)] bg-charcoal-900 -mx-4 -mt-4 md:-mx-6 md:-mt-6 px-4 py-5 md:px-6 rounded-b-xl">
        <div>
          <h1 className="text-2xl font-bold text-white">{t("nav.unitTurns")}</h1>
          <p className="text-gold-300 text-sm mt-0.5">{t("dashboard.turnBatchManagement")}</p>
        </div>
        <CreateBatchButton />
      </div>

      {hasAny ? (
        <div className="space-y-6">
          {/* Open batches */}
          {openBatches.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-content-quaternary uppercase tracking-wider mb-3">
                {t("dashboard.openBatches")}
              </h2>
              <div className="space-y-3">
                {openBatches.map((batch: any) => (
                  <BatchCard
                    key={batch.id}
                    batch={batch}
                    unitCount={unitCounts[batch.id] || 0}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Closed batches */}
          {closedBatches.length > 0 && (
            <div>
              <h2 className="text-sm font-bold text-content-quaternary uppercase tracking-wider mb-3">
                {t("dashboard.closedBatches")}
              </h2>
              <div className="space-y-3">
                {closedBatches.map((batch: any) => (
                  <BatchCard
                    key={batch.id}
                    batch={batch}
                    unitCount={unitCounts[batch.id] || 0}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-12 text-center shadow-sm">
          <div className="w-16 h-16 bg-brand-50 rounded-2xl mx-auto mb-4 flex items-center justify-center">
            <svg className="w-8 h-8 text-brand-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-content-primary mb-2">
            {t("dashboard.noTurnBatches")}
          </h3>
          <p className="text-content-quaternary mb-6">
            {t("dashboard.createFirstBatch")}
          </p>
          <CreateBatchButton />
        </div>
      )}
    </div>
  );
}
