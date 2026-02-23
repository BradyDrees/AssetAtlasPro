import { requireVendorRole } from "@/lib/vendor/role-helpers";
import { getOrgSkills, getTeamMembers, getUserSkills } from "@/app/actions/vendor-skills";
import { SkillsManager } from "@/components/vendor/skills-manager";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function TeamPage() {
  const auth = await requireVendorRole();
  const t = await getTranslations("vendor.profile");
  const isAdmin = auth.role === "owner" || auth.role === "admin" || auth.role === "office_manager";

  const [{ data: skills }, teamMembers] = await Promise.all([
    getOrgSkills(),
    getTeamMembers(),
  ]);

  // Build user skills map
  const userSkillsMap: Record<string, Awaited<ReturnType<typeof getUserSkills>>["data"]> = {};
  for (const member of teamMembers) {
    const { data } = await getUserSkills(member.id);
    userSkillsMap[member.id] = data;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/vendor/profile" className="p-1.5 rounded-lg hover:bg-surface-secondary text-content-tertiary">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-content-primary">{t("team.title")}</h1>
      </div>

      {teamMembers.length === 0 ? (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center">
          <p className="text-sm text-content-tertiary">{t("team.noMembers")}</p>
        </div>
      ) : (
        <SkillsManager skills={skills} teamMembers={teamMembers} userSkillsMap={userSkillsMap} isAdmin={isAdmin} />
      )}
    </div>
  );
}
