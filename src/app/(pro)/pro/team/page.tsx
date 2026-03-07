import { redirect } from "next/navigation";
import { requireVendorRole } from "@/lib/vendor/role-helpers";
import { getTeamDashboard } from "@/app/actions/vendor-team";
import { TeamDashboard } from "@/components/vendor/team-dashboard";
import { getTranslations } from "next-intl/server";

export default async function TeamPage() {
  const auth = await requireVendorRole();
  const t = await getTranslations("vendor.workers");

  // Tech: no access to team page — redirect to schedule
  if (auth.role === "tech") {
    redirect("/pro/schedule");
  }

  const { members, pendingInvites, error } = await getTeamDashboard();

  const readOnly = auth.role === "office_manager";

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <h1 className="text-2xl font-bold text-content-primary">{t("teamTitle")}</h1>
      </div>

      {error ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      ) : (
        <TeamDashboard
          members={members}
          pendingInvites={pendingInvites}
          readOnly={readOnly}
        />
      )}
    </div>
  );
}
