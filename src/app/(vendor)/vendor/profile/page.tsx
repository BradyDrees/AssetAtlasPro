import { getVendorProfile, getCredentialSummary } from "@/app/actions/vendor-profile";
import { requireVendorRole } from "@/lib/vendor/role-helpers";
import { ProfileForm } from "@/components/vendor/profile-form";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function VendorProfilePage() {
  const auth = await requireVendorRole();
  const t = await getTranslations("vendor.profile");
  const [{ org, user }, summary] = await Promise.all([
    getVendorProfile(),
    getCredentialSummary(),
  ]);

  if (!org || !user) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center">
          <p className="text-red-400">{t("loadError")}</p>
        </div>
      </div>
    );
  }

  const isAdmin = auth.role === "owner" || auth.role === "admin";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-content-primary">
          {t("title")}
        </h1>
      </div>

      {/* Credentials Summary Card */}
      <Link
        href="/vendor/profile/credentials"
        className="block bg-surface-primary rounded-xl border border-edge-primary p-5 hover:border-edge-secondary transition-colors group"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-content-primary">
            {t("credentials.title")}
          </h2>
          <svg className="w-5 h-5 text-content-quaternary group-hover:text-content-tertiary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </div>
        <div className="grid grid-cols-4 gap-3">
          <div className="text-center">
            <p className="text-2xl font-bold text-content-primary">{summary.total}</p>
            <p className="text-xs text-content-quaternary">{t("credentials.totalLabel")}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">{summary.active}</p>
            <p className="text-xs text-content-quaternary">{t("credentials.active")}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-400">{summary.expiringSoon}</p>
            <p className="text-xs text-content-quaternary">{t("credentials.expiringSoon")}</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-400">{summary.expired}</p>
            <p className="text-xs text-content-quaternary">{t("credentials.expired")}</p>
          </div>
        </div>
      </Link>

      {/* Profile Form */}
      <ProfileForm org={org} user={user} isAdmin={isAdmin} />
    </div>
  );
}
