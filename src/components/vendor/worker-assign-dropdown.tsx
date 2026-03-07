"use client";

import { useState, useEffect, useRef, useTransition } from "react";
import { useTranslations } from "next-intl";
import { getTeamMembers } from "@/app/actions/vendor-skills";
import { assignWorkerToJob } from "@/app/actions/vendor-work-orders";
import { useVendorRole } from "@/components/vendor/vendor-role-provider";

interface TeamMember {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  trades: string[];
}

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-amber-500/20 text-amber-400",
  admin: "bg-purple-500/20 text-purple-400",
  office_manager: "bg-blue-500/20 text-blue-400",
  tech: "bg-green-500/20 text-green-400",
};

export function WorkerAssignDropdown({
  woId,
  currentAssignedTo,
  onAssigned,
}: {
  woId: string;
  currentAssignedTo: string | null;
  onAssigned?: () => void;
}) {
  const t = useTranslations("vendor.jobs");
  const vendorRole = useVendorRole();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Tech role cannot assign — render read-only label
  const canAssign = vendorRole !== "tech";

  useEffect(() => {
    if (canAssign) {
      getTeamMembers().then(setMembers);
    }
  }, [canAssign]);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [open]);

  const assignedMember = members.find((m) => m.id === currentAssignedTo);

  function handleAssign(vendorUserId: string | null) {
    setError(null);
    startTransition(async () => {
      const res = await assignWorkerToJob(woId, vendorUserId);
      if (res.error) {
        setError(res.error);
      } else {
        setOpen(false);
        onAssigned?.();
      }
    });
  }

  // Read-only for techs
  if (!canAssign) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span className="text-content-tertiary">{t("detail.assignedTo")}:</span>
        <span className="text-content-secondary font-medium">
          {currentAssignedTo ? (assignedMember
            ? `${assignedMember.first_name ?? ""} ${assignedMember.last_name ?? ""}`.trim()
            : t("detail.assignedTo")
          ) : t("assignment.unassigned")}
        </span>
      </div>
    );
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={isPending}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm rounded-lg border border-edge-secondary bg-surface-secondary hover:bg-surface-tertiary transition-colors disabled:opacity-50"
      >
        <svg className="w-4 h-4 text-content-tertiary" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
        <span className="text-content-primary">
          {isPending
            ? "..."
            : currentAssignedTo && assignedMember
              ? `${assignedMember.first_name ?? ""} ${assignedMember.last_name ?? ""}`.trim()
              : t("assignment.unassigned")}
        </span>
        <svg className={`w-3 h-3 text-content-quaternary transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {error && (
        <p className="absolute top-full left-0 mt-1 text-xs text-red-400">{error}</p>
      )}

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-surface-primary border border-edge-primary rounded-xl shadow-lg z-50 py-1 max-h-64 overflow-y-auto">
          {/* Unassigned option */}
          <button
            type="button"
            onClick={() => handleAssign(null)}
            className={`w-full text-left px-3 py-2 text-sm hover:bg-surface-secondary transition-colors flex items-center gap-2 ${
              !currentAssignedTo ? "bg-surface-secondary" : ""
            }`}
          >
            <span className="w-6 h-6 rounded-full bg-content-quaternary/20 flex items-center justify-center text-xs text-content-quaternary">
              —
            </span>
            <span className="text-content-secondary">{t("assignment.unassigned")}</span>
          </button>

          {/* Team members */}
          {members.map((m) => {
            const name = `${m.first_name ?? ""} ${m.last_name ?? ""}`.trim() || m.role;
            const isSelected = m.id === currentAssignedTo;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleAssign(m.id)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-surface-secondary transition-colors flex items-center gap-2 ${
                  isSelected ? "bg-surface-secondary" : ""
                }`}
              >
                <span className="w-6 h-6 rounded-full bg-brand-500/20 flex items-center justify-center text-xs text-brand-400 font-medium shrink-0">
                  {(m.first_name?.[0] ?? m.role[0]).toUpperCase()}
                </span>
                <div className="min-w-0 flex-1">
                  <span className="text-content-primary block truncate">{name}</span>
                  <span className={`inline-block text-[10px] px-1.5 py-0.5 rounded-full leading-none ${ROLE_COLORS[m.role] ?? "bg-surface-tertiary text-content-quaternary"}`}>
                    {m.role.replace("_", " ")}
                  </span>
                </div>
                {isSelected && (
                  <svg className="w-4 h-4 text-brand-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
              </button>
            );
          })}

          {members.length === 0 && (
            <p className="px-3 py-2 text-sm text-content-quaternary">{t("assignment.noMembers")}</p>
          )}
        </div>
      )}
    </div>
  );
}
