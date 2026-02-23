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

      {/* Quick Links */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link
            href="/vendor/profile/settings"
            className="flex items-center gap-3 bg-surface-primary rounded-xl border border-edge-primary p-4 hover:border-edge-secondary transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-brand-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 010-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.28z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-content-primary">{t("settings.title")}</p>
              <p className="text-xs text-content-quaternary truncate">Numbering, tax rates, job types, working hours</p>
            </div>
            <svg className="w-5 h-5 text-content-quaternary group-hover:text-content-tertiary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
          <Link
            href="/vendor/profile/team"
            className="flex items-center gap-3 bg-surface-primary rounded-xl border border-edge-primary p-4 hover:border-edge-secondary transition-colors group"
          >
            <div className="w-10 h-10 rounded-lg bg-brand-500/20 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-brand-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-content-primary">{t("team.title")}</p>
              <p className="text-xs text-content-quaternary truncate">Skills, certifications, team assignment</p>
            </div>
            <svg className="w-5 h-5 text-content-quaternary group-hover:text-content-tertiary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </Link>
        </div>
      )}

      {/* Profile Form */}
      <ProfileForm org={org} user={user} isAdmin={isAdmin} />
    </div>
  );
}
