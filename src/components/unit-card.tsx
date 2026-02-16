"use client";

import { useState } from "react";
import Link from "next/link";
import { deleteUnit } from "@/app/actions/units";
import { TENANT_GRADES, UNIT_GRADES } from "@/lib/unit-constants";
import type { DDUnit } from "@/lib/types";

interface UnitCardProps {
  unit: DDUnit;
  projectId: string;
  captureCount: number;
  isListBusy?: boolean;
  onDeleteStart?: () => void;
  onDeleteEnd?: () => void;
}

export function UnitCard({
  unit,
  projectId,
  captureCount,
  isListBusy = false,
  onDeleteStart,
  onDeleteEnd,
}: UnitCardProps) {
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isListBusy) return; // another delete is in-flight
    if (!confirm(`Delete B${unit.building} - ${unit.unit_number}? All photos will be removed.`)) return;

    setDeleting(true);
    onDeleteStart?.();
    try {
      await deleteUnit(unit.id, projectId, unit.project_section_id);
    } catch (err) {
      console.error("Delete failed:", err);
      setDeleting(false);
    } finally {
      onDeleteEnd?.();
    }
  };

  const tenantInfo = unit.tenant_grade
    ? TENANT_GRADES[unit.tenant_grade as keyof typeof TENANT_GRADES]
    : null;
  const unitInfo = unit.unit_grade
    ? UNIT_GRADES[unit.unit_grade as keyof typeof UNIT_GRADES]
    : null;

  return (
    <Link
      href={`/projects/${projectId}/sections/${unit.project_section_id}/units/${unit.id}`}
      className={`block bg-surface-primary rounded-lg border border-edge-primary p-3 hover:bg-surface-secondary
                  transition-colors ${deleting ? "opacity-50 pointer-events-none" : ""}`}
    >
      <div className="flex items-start justify-between">
        <div className="min-w-0 flex-1">
          {/* Building + Unit */}
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold text-content-primary text-sm">
              B{unit.building} — {unit.unit_number}
            </span>
            {unit.bd_ba && (
              <span className="text-xs text-content-quaternary">{unit.bd_ba}</span>
            )}
          </div>

          {/* Grade badges */}
          <div className="flex flex-wrap gap-1.5 mb-1">
            {tenantInfo && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded font-medium ${tenantInfo.color}`}
              >
                T:{unit.tenant_grade}
              </span>
            )}
            {unitInfo && (
              <span
                className={`text-xs px-1.5 py-0.5 rounded font-medium ${unitInfo.color}`}
              >
                U:{unit.unit_grade}
              </span>
            )}
            {unit.has_mold && (
              <span className="text-xs px-1.5 py-0.5 rounded font-medium bg-red-100 text-red-700">
                Mold
              </span>
            )}
          </div>

          {/* Photo count */}
          {captureCount > 0 && (
            <span className="text-xs text-content-muted">
              {captureCount} photo{captureCount !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Delete button */}
        <button
          onClick={handleDelete}
          disabled={deleting || isListBusy}
          className="text-content-muted hover:text-red-500 transition-colors p-1 flex-shrink-0 disabled:opacity-30"
          aria-label="Delete unit"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </Link>
  );
}
