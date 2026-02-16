"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addUnitToBatch } from "@/app/actions/unit-turns";

interface AddUnitInlineProps {
  batchId: string;
  lastProperty: string;
}

export function AddUnitInline({ batchId, lastProperty }: AddUnitInlineProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [property, setProperty] = useState(lastProperty);
  const [unitLabel, setUnitLabel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!property.trim() || !unitLabel.trim()) return;

    setLoading(true);
    setError("");

    const result = await addUnitToBatch({
      batch_id: batchId,
      property: property.trim(),
      unit_label: unitLabel.trim(),
    });

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    // Navigate to the new unit
    router.push(`/unit-turns/${batchId}/units/${result.id}`);
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-full py-3 bg-white border-2 border-dashed border-orange-300 text-orange-600 text-sm font-medium rounded-lg hover:bg-orange-50 hover:border-orange-400 transition-colors"
      >
        + Create New Unit
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-orange-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Create New Unit</h3>
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">Property</label>
          <input
            type="text"
            value={property}
            onChange={(e) => setProperty(e.target.value)}
            placeholder="e.g. Veridian"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            required
          />
        </div>
        <div className="flex-1">
          <label className="block text-xs font-medium text-gray-500 mb-1">Unit #</label>
          <input
            type="text"
            value={unitLabel}
            onChange={(e) => setUnitLabel(e.target.value)}
            placeholder="e.g. 102"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            autoFocus
            required
          />
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mt-3">{error}</p>
      )}
      <div className="flex justify-end gap-3 mt-3">
        <button
          type="button"
          onClick={() => { setOpen(false); setError(""); setUnitLabel(""); }}
          className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={!property.trim() || !unitLabel.trim() || loading}
          className="px-4 py-1.5 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
        >
          {loading ? "Creating..." : "Create & Open"}
        </button>
      </div>
    </form>
  );
}
