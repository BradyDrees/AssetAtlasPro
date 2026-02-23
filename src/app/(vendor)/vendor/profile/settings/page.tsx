import { getOrgSettings } from "@/app/actions/vendor-profile";
import { requireVendorRole } from "@/lib/vendor/role-helpers";
import { OrgSettingsForm } from "@/components/vendor/org-settings-form";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function OrgSettingsPage() {
  const auth = await requireVendorRole();
  const t = await getTranslations("vendor.profile");
  const { settings } = await getOrgSettings();

  const isAdmin = auth.role === "owner" || auth.role === "admin" || auth.role === "office_manager";

  if (!isAdmin) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center">
          <p className="text-content-tertiary">You do not have permission to access settings.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/vendor/profile" className="p-1.5 rounded-lg hover:bg-surface-secondary text-content-tertiary">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <h1 className="text-2xl font-bold text-content-primary">{t("settings.title")}</h1>
      </div>
      <OrgSettingsForm initialSettings={settings} />
    </div>
  );
}
