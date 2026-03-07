"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import type { TeamDashboardMember, PendingInvite } from "@/app/actions/vendor-team";
import { updateMemberRole, deactivateMember, reactivateMember } from "@/app/actions/vendor-team";
import { revokeWorkerInvite } from "@/app/actions/vendor-worker-invites";
import { useVendorRole } from "@/components/vendor/vendor-role-provider";
import type { VendorOrgRole } from "@/lib/vendor/types";
import { InviteWorkerForm } from "./invite-worker-form";

const ROLE_COLORS: Record<string, string> = {
  owner: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  admin: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  office_manager: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  tech: "bg-green-500/20 text-green-400 border-green-500/30",
};

const ROLE_LABELS: Record<string, string> = {
  owner: "Owner",
  admin: "Admin",
  office_manager: "Office Mgr",
  tech: "Tech",
};

export function TeamDashboard({
  members: initialMembers,
  pendingInvites: initialInvites,
  readOnly = false,
}: {
  members: TeamDashboardMember[];
  pendingInvites: PendingInvite[];
  readOnly?: boolean;
}) {
  const t = useTranslations("vendor.workers");
  const vendorRole = useVendorRole();
  const isOwner = vendorRole === "owner";
  const isOwnerOrAdmin = vendorRole === "owner" || vendorRole === "admin";
  const [members, setMembers] = useState(initialMembers);
  const [invites, setInvites] = useState(initialInvites);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [actionError, setActionError] = useState<string | null>(null);
  const [roleEditId, setRoleEditId] = useState<string | null>(null);

  function handleRoleChange(memberId: string, newRole: VendorOrgRole) {
    setActionError(null);
    startTransition(async () => {
      const res = await updateMemberRole(memberId, newRole);
      if (res.error) {
        setActionError(res.error);
      } else {
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, role: newRole } : m))
        );
        setRoleEditId(null);
      }
    });
  }

  function handleDeactivate(memberId: string) {
    setActionError(null);
    startTransition(async () => {
      const res = await deactivateMember(memberId);
      if (res.error) {
        setActionError(res.error);
      } else {
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, is_active: false } : m))
        );
      }
    });
  }

  function handleReactivate(memberId: string) {
    setActionError(null);
    startTransition(async () => {
      const res = await reactivateMember(memberId);
      if (res.error) {
        setActionError(res.error);
      } else {
        setMembers((prev) =>
          prev.map((m) => (m.id === memberId ? { ...m, is_active: true } : m))
        );
      }
    });
  }

  function handleRevokeInvite(inviteId: string) {
    setActionError(null);
    startTransition(async () => {
      const res = await revokeWorkerInvite(inviteId);
      if (res.error) {
        setActionError(res.error);
      } else {
        setInvites((prev) => prev.filter((i) => i.id !== inviteId));
      }
    });
  }

  const activeMembers = members.filter((m) => m.is_active);
  const inactiveMembers = members.filter((m) => !m.is_active);

  return (
    <div className="space-y-5">
      {/* Error banner */}
      {actionError && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
          {actionError}
        </div>
      )}

      {/* Invite button — owner/admin only */}
      {isOwnerOrAdmin && !readOnly && (
        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => setShowInviteForm(!showInviteForm)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg bg-brand-600 text-white hover:bg-brand-700 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
            </svg>
            {t("inviteWorker")}
          </button>
        </div>
      )}

      {/* Invite form */}
      {showInviteForm && !readOnly && (
        <InviteWorkerForm
          onClose={() => setShowInviteForm(false)}
          onInvited={(invite) => {
            setInvites((prev) => [invite, ...prev]);
            setShowInviteForm(false);
          }}
        />
      )}

      {/* Pending invites — owner/admin only */}
      {isOwnerOrAdmin && !readOnly && invites.length > 0 && (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-4">
          <h3 className="text-sm font-semibold text-content-primary mb-3 flex items-center gap-2">
            <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
            {t("pendingInvites")} ({invites.length})
          </h3>
          <div className="space-y-2">
            {invites.map((inv) => (
              <div
                key={inv.id}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-lg bg-surface-secondary"
              >
                <div className="min-w-0">
                  <p className="text-sm text-content-primary truncate">{inv.email}</p>
                  <p className="text-xs text-content-quaternary">
                    {ROLE_LABELS[inv.role] ?? inv.role}
                    {inv.invited_by_name && ` • ${t("invitedBy")} ${inv.invited_by_name}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleRevokeInvite(inv.id)}
                  disabled={isPending}
                  className="text-xs text-red-400 hover:text-red-300 font-medium shrink-0 disabled:opacity-50"
                >
                  {t("revoke")}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active members */}
      <div className="bg-surface-primary rounded-xl border border-edge-primary">
        <div className="px-4 py-3 border-b border-edge-primary">
          <h3 className="text-sm font-semibold text-content-primary">
            {t("activeMembers")} ({activeMembers.length})
          </h3>
        </div>
        <div className="divide-y divide-edge-primary">
          {activeMembers.map((m) => (
            <MemberCard
              key={m.id}
              member={m}
              readOnly={readOnly}
              isOwner={isOwner}
              isOwnerOrAdmin={isOwnerOrAdmin}
              isPending={isPending}
              roleEditId={roleEditId}
              onRoleEditToggle={(id) => setRoleEditId(roleEditId === id ? null : id)}
              onRoleChange={handleRoleChange}
              onDeactivate={handleDeactivate}
              onReactivate={handleReactivate}
            />
          ))}
          {activeMembers.length === 0 && (
            <p className="px-4 py-6 text-sm text-content-quaternary text-center">
              {t("noMembers")}
            </p>
          )}
        </div>
      </div>

      {/* Inactive members */}
      {inactiveMembers.length > 0 && (
        <div className="bg-surface-primary rounded-xl border border-edge-primary opacity-70">
          <div className="px-4 py-3 border-b border-edge-primary">
            <h3 className="text-sm font-semibold text-content-tertiary">
              {t("inactiveMembers")} ({inactiveMembers.length})
            </h3>
          </div>
          <div className="divide-y divide-edge-primary">
            {inactiveMembers.map((m) => (
              <MemberCard
                key={m.id}
                member={m}
                readOnly={readOnly}
                isOwner={isOwner}
                isOwnerOrAdmin={isOwnerOrAdmin}
                isPending={isPending}
                roleEditId={roleEditId}
                onRoleEditToggle={(id) => setRoleEditId(roleEditId === id ? null : id)}
                onRoleChange={handleRoleChange}
                onDeactivate={handleDeactivate}
                onReactivate={handleReactivate}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================
// Member Card Sub-Component
// ============================================

function MemberCard({
  member,
  readOnly,
  isOwner,
  isOwnerOrAdmin,
  isPending,
  roleEditId,
  onRoleEditToggle,
  onRoleChange,
  onDeactivate,
  onReactivate,
}: {
  member: TeamDashboardMember;
  readOnly: boolean;
  isOwner: boolean;
  isOwnerOrAdmin: boolean;
  isPending: boolean;
  roleEditId: string | null;
  onRoleEditToggle: (id: string) => void;
  onRoleChange: (id: string, role: VendorOrgRole) => void;
  onDeactivate: (id: string) => void;
  onReactivate: (id: string) => void;
}) {
  const t = useTranslations("vendor.workers");
  const name = `${member.first_name ?? ""} ${member.last_name ?? ""}`.trim() || member.email || "Unknown";
  const isEditing = roleEditId === member.id;
  const roleOptions: VendorOrgRole[] = ["owner", "admin", "office_manager", "tech"];

  return (
    <div className="px-4 py-3">
      <div className="flex items-start justify-between gap-3">
        {/* Avatar + info */}
        <div className="flex items-start gap-3 min-w-0 flex-1">
          <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-sm font-bold text-brand-400 shrink-0">
            {(member.first_name?.[0] ?? member.email?.[0] ?? "?").toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-medium text-content-primary truncate">
                {name}
              </span>
              <span className={`inline-flex items-center text-[10px] px-1.5 py-0.5 rounded-full border leading-none ${ROLE_COLORS[member.role] ?? "bg-surface-tertiary text-content-quaternary border-edge-secondary"}`}>
                {ROLE_LABELS[member.role] ?? member.role}
              </span>
              {member.is_clocked_in && (
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-green-500/20 text-green-400 border border-green-500/30 leading-none">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                  {t("clockedIn")}
                </span>
              )}
              {!member.is_active && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 leading-none">
                  {t("inactive")}
                </span>
              )}
            </div>

            {member.email && (
              <p className="text-xs text-content-quaternary truncate">{member.email}</p>
            )}

            {/* Stats row */}
            <div className="flex items-center gap-3 mt-1 text-xs text-content-tertiary">
              <span>{t("hoursThisWeek", { hours: member.hours_this_week })}</span>
              {member.trades.length > 0 && (
                <span className="truncate">{member.trades.slice(0, 3).join(", ")}</span>
              )}
            </div>

            {/* Active job */}
            {member.active_job_title && (
              <p className="text-xs text-brand-400 mt-0.5 truncate">
                ▸ {member.active_job_title}
              </p>
            )}
          </div>
        </div>

        {/* Actions */}
        {!readOnly && (
          <div className="flex items-center gap-1 shrink-0">
            {/* Role edit — owner only */}
            {isOwner && (
              <button
                type="button"
                onClick={() => onRoleEditToggle(member.id)}
                className="p-1.5 rounded-lg hover:bg-surface-secondary text-content-quaternary hover:text-content-primary transition-colors"
                title={t("changeRole")}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                </svg>
              </button>
            )}

            {/* Deactivate / Reactivate — owner/admin */}
            {isOwnerOrAdmin && member.is_active && (
              <button
                type="button"
                onClick={() => onDeactivate(member.id)}
                disabled={isPending}
                className="p-1.5 rounded-lg hover:bg-red-500/10 text-content-quaternary hover:text-red-400 transition-colors disabled:opacity-50"
                title={t("deactivate")}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M22 10.5h-6m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                </svg>
              </button>
            )}
            {isOwnerOrAdmin && !member.is_active && (
              <button
                type="button"
                onClick={() => onReactivate(member.id)}
                disabled={isPending}
                className="p-1.5 rounded-lg hover:bg-green-500/10 text-content-quaternary hover:text-green-400 transition-colors disabled:opacity-50"
                title={t("reactivate")}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zM4 19.235v-.11a6.375 6.375 0 0112.75 0v.109A12.318 12.318 0 0110.374 21c-2.331 0-4.512-.645-6.374-1.766z" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Role dropdown (when editing) */}
      {isEditing && !readOnly && (
        <div className="mt-2 ml-13 flex items-center gap-2 flex-wrap">
          {roleOptions.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => onRoleChange(member.id, r)}
              disabled={isPending || r === member.role}
              className={`text-xs px-2 py-1 rounded-lg border transition-colors disabled:opacity-50 ${
                r === member.role
                  ? "bg-brand-500/20 text-brand-400 border-brand-500/30"
                  : "bg-surface-secondary text-content-tertiary border-edge-secondary hover:border-brand-500/30 hover:text-content-primary"
              }`}
            >
              {ROLE_LABELS[r]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
