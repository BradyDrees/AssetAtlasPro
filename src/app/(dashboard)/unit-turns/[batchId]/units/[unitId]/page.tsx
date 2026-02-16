import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import Link from "next/link";
import { CategorySection } from "@/components/unit-turn/category-section";
import { UnitStatusBar } from "@/components/unit-turn/unit-status-bar";
import { NextTurnUnitButton } from "@/components/unit-turn/next-turn-unit-button";
import { QuickNav } from "@/components/unit-turn/quick-nav";
import { AddUnitInline } from "@/components/unit-turn/add-unit-inline";
import { UnitExportButtons } from "@/components/unit-turn/unit-export-buttons";
import type { UnitTurnCategoryData, UnitTurnUnitItemWithTemplate, UnitTurnNoteWithPhotos } from "@/lib/unit-turn-types";

export const dynamic = "force-dynamic";

export default async function UnitTurnDetailPage({
  params,
}: {
  params: Promise<{ batchId: string; unitId: string }>;
}) {
  const { batchId, unitId } = await params;
  const supabase = await createClient();

  // Fetch batch
  const { data: batch } = await supabase
    .from("unit_turn_batches")
    .select("id, name")
    .eq("id", batchId)
    .single();

  if (!batch) notFound();

  // Fetch unit
  const { data: unit } = await supabase
    .from("unit_turn_batch_units")
    .select("*")
    .eq("id", unitId)
    .single();

  if (!unit) notFound();

  // Fetch all categories
  const { data: categories } = await supabase
    .from("unit_turn_categories")
    .select("*")
    .order("sort_order");

  // Fetch all unit items with template data
  const { data: unitItems } = await supabase
    .from("unit_turn_unit_items")
    .select(`
      *,
      template_item:unit_turn_template_items(*)
    `)
    .eq("unit_id", unitId)
    .order("sort_order")
    .order("id");

  // Fetch all notes with photos
  const { data: notes } = await supabase
    .from("unit_turn_notes")
    .select(`
      *,
      photos:unit_turn_note_photos(*)
    `)
    .eq("unit_id", unitId)
    .order("created_at");

  const allCategories = categories ?? [];
  const allItems = (unitItems ?? []) as UnitTurnUnitItemWithTemplate[];
  const allNotes = (notes ?? []) as UnitTurnNoteWithPhotos[];

  // Group items by category
  const categoryDataList: UnitTurnCategoryData[] = allCategories.map((cat: any) => ({
    category: cat,
    items: allItems.filter((i) => i.category_id === cat.id),
    notes: allNotes.filter((n) => n.category_id === cat.id),
  }));

  // Separate standard categories, paint, and cleaning
  const standardCategories = categoryDataList.filter((c) => c.category.category_type === "standard");
  const paintCategories = categoryDataList.filter((c) => c.category.category_type === "paint");
  const cleaningCategories = categoryDataList.filter((c) => c.category.category_type === "cleaning");

  // Overall progress
  const totalItems = allItems.length;
  const assessedItems = allItems.filter((i) => i.status != null || i.is_na).length;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

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
          <Link href={`/unit-turns/${batchId}`} className="hover:text-white transition-colors">
            {batch.name}
          </Link>
          <span className="text-orange-500">/</span>
          <span className="text-white font-medium">Unit {unit.unit_label}</span>
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/unit-turns/${batchId}`}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-orange-200 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
              title="Back to batch"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
              </svg>
              Batch
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-orange-300 bg-white/10 px-2 py-0.5 rounded">
                  {unit.property}
                </span>
                <h1 className="text-2xl font-bold text-white">Unit {unit.unit_label}</h1>
              </div>
              <p className="text-sm text-orange-300/70 mt-0.5">
                {assessedItems}/{totalItems} Items Assessed ({totalItems > 0 ? Math.round((assessedItems / totalItems) * 100) : 0}%)
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Unit Status Bar */}
      <div className="mb-6">
        <UnitStatusBar unitId={unitId} batchId={batchId} currentStatus={unit.status} />
      </div>

      {/* Quick Nav */}
      <QuickNav categories={allCategories} />

      {/* Standard Categories */}
      <div className="space-y-5">
        {standardCategories.map((cd) => (
          <div key={cd.category.id} id={`cat-${cd.category.slug}`}>
            <CategorySection
              data={cd}
              batchId={batchId}
              unitId={unitId}
              supabaseUrl={supabaseUrl}
            />
          </div>
        ))}
      </div>

      {/* Paint Section */}
      {paintCategories.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Paint</h2>
          <div className="space-y-5">
            {paintCategories.map((cd) => (
              <div key={cd.category.id} id={`cat-${cd.category.slug}`}>
                <CategorySection
                  data={cd}
                  batchId={batchId}
                  unitId={unitId}
                  supabaseUrl={supabaseUrl}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cleaning Section */}
      {cleaningCategories.length > 0 && (
        <div className="mt-8">
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Cleaning</h2>
          <div className="space-y-5">
            {cleaningCategories.map((cd) => (
              <div key={cd.category.id} id={`cat-${cd.category.slug}`}>
                <CategorySection
                  data={cd}
                  batchId={batchId}
                  unitId={unitId}
                  supabaseUrl={supabaseUrl}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Buttons */}
      <div className="mt-8">
        <UnitExportButtons
          batchId={batchId}
          unitId={unitId}
          batchName={batch.name}
          property={unit.property}
          unitLabel={unit.unit_label}
        />
      </div>

      {/* Bottom Actions: Next Unit + Create New Unit */}
      <div className="mt-4 mb-4 space-y-3">
        <NextTurnUnitButton batchId={batchId} currentUnitId={unitId} />
        <AddUnitInline batchId={batchId} lastProperty={unit.property} />
      </div>
    </div>
  );
}
