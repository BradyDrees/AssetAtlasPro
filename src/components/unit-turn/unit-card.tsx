"use client";

import Link from "next/link";
import { UNIT_STATUS_LABELS } from "@/lib/unit-turn-constants";

interface UnitCardProps {
  unit: {
    id: string;
    property: string;
    unit_label: string;
    status: string;
  };
  batchId: string;
  totalItems: number;
  assessedItems: number;
}

export function UnitCard({ unit, batchId, totalItems, assessedItems }: UnitCardProps) {
  const statusInfo = UNIT_STATUS_LABELS[unit.status] ?? UNIT_STATUS_LABELS.NOT_STARTED;
  const pct = totalItems > 0 ? Math.round((assessedItems / totalItems) * 100) : 0;

  return (
    <Link
      href={`/unit-turns/${batchId}/units/${unit.id}`}
      className="block bg-surface-primary rounded-lg border border-edge-primary p-4 hover:shadow-md hover:border-brand-300 transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-content-quaternary bg-surface-tertiary px-2 py-0.5 rounded">
              {unit.property}
            </span>
            <h3 className="text-sm font-semibold text-content-primary">Unit {unit.unit_label}</h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>
              {statusInfo.label}
            </span>
          </div>
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                <div
                  className="bg-brand-500 h-1.5 rounded-full transition-all"
                  style={{ width: `${pct}%` }}
                />
              </div>
              <span className="text-xs text-content-quaternary">
                {assessedItems}/{totalItems} ({pct}%)
              </span>
            </div>
          </div>
        </div>
        <span className="text-content-muted text-lg ml-3">→</span>
      </div>
    </Link>
  );
}
