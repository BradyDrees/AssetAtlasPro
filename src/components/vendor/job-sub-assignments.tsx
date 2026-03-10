"use client";

import { useState, useEffect, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  getWoSubAssignments,
  updateSubAssignment,
  removeSubAssignment,
  type SubAssignment,
} from "@/app/actions/vendor-subcontractors";
import { SubAssignmentModal } from "./sub-assignment-modal";

interface JobSubAssignmentsProps {
  woId: string;
  /** If true, show assign button */
  isAdmin: boolean;
}

const STATUS_COLORS: Record<string, string> = {
  assigned: "bg-blue-500/10 text-blue-400",
  accepted: "bg-green-500/10 text-green-400",
  declined: "bg-red-500/10 text-red-400",
  completed: "bg-emerald-500/10 text-emerald-400",
};

export function JobSubAssignments({ woId, isAdmin }: JobSubAssignmentsProps) {
  const t = useTranslations("vendor.workers");
  const [assignments, setAssignments] = useState<SubAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isPending, startTransition] = useTransition();

  const loadAssignments = async () => {
    const result = await getWoSubAssignments(woId);
    setAssignments(result.data);
    setLoading(false);
  };

  useEffect(() => {
    loadAssignments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [woId]);

  const handleStatusUpdate = (id: string, status: string) => {
    startTransition(async () => {
      await updateSubAssignment(id, { status });
      loadAssignments();
    });
  };

  const handleRemove = (id: string) => {
    startTransition(async () => {
      await removeSubAssignment(id);
      loadAssignments();
    });
  };

  if (loading) return null;

  // Don't show if no assignments and not admin
  if (assignments.length === 0 && !isAdmin) return null;

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-content-primary flex items-center gap-2">
          <svg className="w-4 h-4 text-content-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
          </svg>
          {t("sub.title")}
        </h3>
        {isAdmin && (
          <button
            onClick={() => setShowModal(true)}
            className="text-xs text-brand-400 hover:text-brand-300 font-medium"
          >
            + {t("sub.assign")}
          </button>
        )}
      </div>

      {assignments.length === 0 ? (
        <p className="text-xs text-content-quaternary">{t("sub.noAssignments")}</p>
      ) : (
        <div className="space-y-2">
          {assignments.map((a) => (
            <div
              key={a.id}
              className="flex items-center justify-between gap-3 p-3 bg-surface-secondary rounded-lg"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-full bg-surface-tertiary flex items-center justify-center text-xs font-bold text-content-tertiary flex-shrink-0">
                  {(a.sub_name ?? "?").charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-content-primary truncate">
                    {a.sub_name ?? t("sub.unnamed")}
                  </p>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${STATUS_COLORS[a.status] ?? STATUS_COLORS.assigned}`}>
                      {t(`sub.status.${a.status}`)}
                    </span>
                    {(a.hourly_rate || a.flat_rate) && (
                      <span className="text-[10px] text-content-quaternary">
                        {a.hourly_rate
                          ? `$${a.hourly_rate}/hr`
                          : `$${a.flat_rate} flat`}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 flex-shrink-0">
                {a.status === "assigned" && (
                  <button
                    onClick={() => handleStatusUpdate(a.id, "completed")}
                    disabled={isPending}
                    className="p-1.5 text-green-400 hover:text-green-300 disabled:opacity-50"
                    title={t("sub.markComplete")}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </button>
                )}
                {isAdmin && (
                  <button
                    onClick={() => handleRemove(a.id)}
                    disabled={isPending}
                    className="p-1.5 text-content-quaternary hover:text-red-400 disabled:opacity-50"
                    title={t("sub.remove")}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <SubAssignmentModal
          workOrderId={woId}
          onClose={() => setShowModal(false)}
          onAssigned={() => {
            setShowModal(false);
            loadAssignments();
          }}
        />
      )}
    </div>
  );
}
