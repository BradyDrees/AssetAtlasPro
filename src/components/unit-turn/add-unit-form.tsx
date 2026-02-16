"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addUnitToBatch } from "@/app/actions/unit-turns";

interface AddUnitFormProps {
  batchId: string;
}

export function AddUnitForm({ batchId }: AddUnitFormProps) {
  const router = useRouter();
  const [property, setProperty] = useState("");
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

    // Clear unit label (property stays sticky)
    setUnitLabel("");
    setLoading(false);
    router.refresh();
  };

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 mb-3">Add Unit</h3>
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
            placeholder="e.g. 101"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            autoFocus
            required
          />
        </div>
        <div className="flex items-end">
          <button
            type="submit"
            disabled={!property.trim() || !unitLabel.trim() || loading}
            className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            {loading ? "Adding..." : "+ Add"}
          </button>
        </div>
      </div>
      {error && (
        <p className="text-sm text-red-600 bg-red-50 px-3 py-2 rounded-lg mt-3">{error}</p>
      )}
    </form>
  );
}
