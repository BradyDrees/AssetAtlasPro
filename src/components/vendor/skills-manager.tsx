"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  createSkill,
  deactivateSkill,
  assignSkillToUser,
  removeSkillFromUser,
} from "@/app/actions/vendor-skills";
import type { VendorSkill, VendorUserSkill } from "@/lib/vendor/expense-types";
import type { SkillProficiency } from "@/lib/vendor/types";

// ---------------------------------------------------------------------------
// Local types
// ---------------------------------------------------------------------------

interface TeamMember {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  trades: string[];
}

interface SkillsManagerProps {
  skills: VendorSkill[];
  teamMembers: TeamMember[];
  userSkillsMap: Record<
    string,
    (VendorUserSkill & { skill_name: string; skill_category: string | null })[] | undefined
  >;
  isAdmin: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PROFICIENCY_COLORS: Record<SkillProficiency, string> = {
  learning: "bg-yellow-500/20 text-yellow-400",
  competent: "bg-brand-500/20 text-brand-400",
  expert: "bg-purple-500/20 text-purple-400",
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function SkillsManager({
  skills: initialSkills,
  teamMembers,
  userSkillsMap: initialUserSkillsMap,
  isAdmin,
}: SkillsManagerProps) {
  const t = useTranslations("vendor.profile");
  const [isPending, startTransition] = useTransition();

  // State
  const [skills, setSkills] = useState<VendorSkill[]>(initialSkills);
  const [userSkillsMap, setUserSkillsMap] = useState(initialUserSkillsMap);
  const [message, setMessage] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [selectedMember, setSelectedMember] = useState<string | null>(
    teamMembers.length > 0 ? teamMembers[0].id : null
  );
  const [selectedSkillId, setSelectedSkillId] = useState<string>("");

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------

  function groupByCategory(list: VendorSkill[]): Record<string, VendorSkill[]> {
    const groups: Record<string, VendorSkill[]> = {};
    for (const s of list) {
      const cat = s.category || "General";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(s);
    }
    return groups;
  }

  function memberName(m: TeamMember): string {
    const parts: string[] = [];
    if (m.first_name) parts.push(m.first_name);
    if (m.last_name) parts.push(m.last_name);
    if (parts.length > 0) return parts.join(" ");
    // Fallback: show role in title case instead of a raw UUID
    return m.role
      ? m.role
          .split("_")
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(" ")
      : m.user_id.slice(0, 8);
  }

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  function handleAddSkill() {
    if (!newName.trim()) return;
    startTransition(async () => {
      const res = await createSkill(
        newName.trim(),
        newCategory.trim() || undefined,
      );
      if (res.error) {
        setMessage(t("skills.createError"));
      } else if (res.data) {
        setSkills((prev) => [...prev, res.data!]);
        setNewName("");
        setNewCategory("");
        setMessage(t("skills.created"));
      }
      setTimeout(() => setMessage(null), 3000);
    });
  }

  function handleRemoveSkill(skillId: string) {
    startTransition(async () => {
      const res = await deactivateSkill(skillId);
      if (!res.error) {
        setSkills((prev) => prev.filter((s) => s.id !== skillId));
      }
    });
  }

  function handleAssignSkill() {
    if (!selectedMember || !selectedSkillId) return;
    startTransition(async () => {
      const res = await assignSkillToUser(
        selectedMember!,
        selectedSkillId,
        "competent" as SkillProficiency,
      );
      if (res.error) {
        setMessage(t("skills.assignError"));
      } else if (res.data) {
        const skill = skills.find((s) => s.id === selectedSkillId);
        const entry = {
          ...res.data,
          skill_name: skill?.name || "",
          skill_category: skill?.category || null,
        };
        setUserSkillsMap((prev) => ({
          ...prev,
          [selectedMember!]: [...(prev[selectedMember!] || []), entry],
        }));
        setSelectedSkillId("");
        setMessage(t("skills.assigned"));
      }
      setTimeout(() => setMessage(null), 3000);
    });
  }

  function handleRemoveUserSkill(vendorUserId: string, skillId: string) {
    startTransition(async () => {
      const res = await removeSkillFromUser(vendorUserId, skillId);
      if (!res.error) {
        setUserSkillsMap((prev) => ({
          ...prev,
          [vendorUserId]: (prev[vendorUserId] || []).filter((us) => us.skill_id !== skillId),
        }));
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Derived data
  // ---------------------------------------------------------------------------

  const grouped = groupByCategory(skills);
  const selectedMemberSkills = selectedMember ? userSkillsMap[selectedMember] || [] : [];
  const assignedSkillIds = new Set(selectedMemberSkills.map((us) => us.skill_id));
  const unassignedSkills = skills.filter((s) => !assignedSkillIds.has(s.id));

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <div className="space-y-6">
      {/* Feedback message */}
      {message && (
        <div className="rounded-lg bg-brand-600/20 px-4 py-2 text-sm text-brand-400">
          {message}
        </div>
      )}

      {/* ----------------------------------------------------------------- */}
      {/* Org Skills */}
      {/* ----------------------------------------------------------------- */}
      <div className="rounded-xl border border-edge-primary bg-surface-primary p-5">
        <h3 className="mb-4 text-lg font-semibold text-content-primary">
          {t("skills.title")}
        </h3>

        {/* Grouped chips */}
        {Object.entries(grouped).map(([category, catSkills]) => (
          <div key={category} className="mb-4">
            <p className="mb-1.5 text-xs font-medium uppercase tracking-wider text-content-muted">
              {category}
            </p>
            <div className="flex flex-wrap gap-2">
              {catSkills.map((skill) => (
                <span
                  key={skill.id}
                  className="inline-flex items-center gap-1.5 rounded-full bg-surface-secondary px-3 py-1 text-sm text-content-secondary"
                >
                  {skill.name}
                  {isAdmin && (
                    <button
                      type="button"
                      disabled={isPending}
                      onClick={() => handleRemoveSkill(skill.id)}
                      className="ml-0.5 text-content-muted hover:text-red-400 transition-colors"
                    >
                      &times;
                    </button>
                  )}
                </span>
              ))}
            </div>
          </div>
        ))}

        {/* Add skill form (admin only) */}
        {isAdmin && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={t("skills.namePlaceholder")}
              className="rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              placeholder={t("skills.categoryPlaceholder")}
              className="rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-sm text-content-primary placeholder:text-content-muted focus:outline-none focus:ring-2 focus:ring-brand-600"
            />
            <button
              type="button"
              disabled={isPending || !newName.trim()}
              onClick={handleAddSkill}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {t("skills.add")}
            </button>
          </div>
        )}
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* Team Skills */}
      {/* ----------------------------------------------------------------- */}
      <div className="rounded-xl border border-edge-primary bg-surface-primary p-5">
        <h3 className="mb-4 text-lg font-semibold text-content-primary">
          {t("skills.teamSkills")}
        </h3>

        {/* Member tabs */}
        <div className="mb-4 flex flex-wrap gap-2">
          {teamMembers.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => {
                setSelectedMember(m.id);
                setSelectedSkillId("");
              }}
              className={
                "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors " +
                (selectedMember === m.id
                  ? "bg-brand-600 text-white"
                  : "bg-surface-secondary text-content-secondary hover:bg-surface-tertiary")
              }
            >
              {memberName(m)}
            </button>
          ))}
        </div>

        {/* Selected member skills */}
        {selectedMember && (
          <div>
            {selectedMemberSkills.length === 0 ? (
              <p className="text-sm text-content-muted">{t("skills.noSkills")}</p>
            ) : (
              <div className="mb-4 flex flex-wrap gap-2">
                {selectedMemberSkills.map((us) => (
                  <span
                    key={us.id}
                    className="inline-flex items-center gap-1.5 rounded-full bg-surface-secondary px-3 py-1 text-sm text-content-secondary"
                  >
                    {us.skill_name}
                    <span
                      className={
                        "rounded-full px-1.5 py-0.5 text-xs font-medium " +
                        (PROFICIENCY_COLORS[us.proficiency as SkillProficiency] || "")
                      }
                    >
                      {us.proficiency}
                    </span>
                    {isAdmin && (
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => handleRemoveUserSkill(selectedMember!, us.skill_id)}
                        className="ml-0.5 text-content-muted hover:text-red-400 transition-colors"
                      >
                        &times;
                      </button>
                    )}
                  </span>
                ))}
              </div>
            )}

            {/* Assign skill form (admin only) */}
            {isAdmin && unassignedSkills.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={selectedSkillId}
                  onChange={(e) => setSelectedSkillId(e.target.value)}
                  className="rounded-lg border border-edge-primary bg-surface-secondary px-3 py-2 text-sm text-content-primary focus:outline-none focus:ring-2 focus:ring-brand-600"
                >
                  <option value="">{t("skills.selectSkill")}</option>
                  {unassignedSkills.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  disabled={isPending || !selectedSkillId}
                  onClick={handleAssignSkill}
                  className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
                >
                  {t("skills.assign")}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
