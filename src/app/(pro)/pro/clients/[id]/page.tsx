import { getPmVendorDetail } from "@/app/actions/pm-vendors";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

function formatCents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(cents / 100);
}

export default async function ProClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("vendor.clients");
  const { vendor, jobs, credentials } = await getPmVendorDetail(id);

  if (!vendor) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center">
          <p className="text-red-400">{t("notFound")}</p>
        </div>
      </div>
    );
  }

  const activeStatuses = [
    "assigned",
    "accepted",
    "scheduled",
    "en_route",
    "on_site",
    "in_progress",
  ];
  const activeJobs = jobs.filter((j) => activeStatuses.includes(j.status));
  const completedJobs = jobs.filter((j) =>
    ["completed", "invoiced", "paid", "done_pending_approval"].includes(j.status)
  );

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/pro/clients"
          className="p-1.5 rounded-lg hover:bg-surface-secondary text-content-tertiary"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15.75 19.5L8.25 12l7.5-7.5"
            />
          </svg>
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-surface-secondary border border-edge-secondary flex items-center justify-center text-content-tertiary font-semibold text-sm">
            {vendor.vendor_logo ? (
              <img
                src={vendor.vendor_logo}
                alt={vendor.vendor_name}
                className="w-10 h-10 rounded-lg object-cover"
              />
            ) : (
              vendor.vendor_name.slice(0, 2).toUpperCase()
            )}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-content-primary">
              {vendor.vendor_name}
            </h1>
            {vendor.vendor_email && (
              <p className="text-sm text-content-tertiary">{vendor.vendor_email}</p>
            )}
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-4 text-center">
          <p className="text-2xl font-bold text-content-primary">
            {vendor.stats.total_jobs}
          </p>
          <p className="text-xs text-content-quaternary">{t("totalJobs")}</p>
        </div>
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-4 text-center">
          <p className="text-2xl font-bold text-brand-400">
            {vendor.stats.active_jobs}
          </p>
          <p className="text-xs text-content-quaternary">{t("activeJobs")}</p>
        </div>
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-4 text-center">
          <p className="text-2xl font-bold text-green-400">
            {formatCents(vendor.stats.total_spent_cents)}
          </p>
          <p className="text-xs text-content-quaternary">{t("totalRevenue")}</p>
        </div>
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-4 text-center">
          <p className="text-2xl font-bold text-content-primary">
            {vendor.payment_terms.replace("_", " ").toUpperCase()}
          </p>
          <p className="text-xs text-content-quaternary">{t("paymentTerms")}</p>
        </div>
      </div>

      {/* Credentials */}
      {credentials.length > 0 && (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-5">
          <h2 className="text-base font-semibold text-content-primary mb-3">
            {t("pmVendors.credentials")}
          </h2>
          <div className="space-y-2">
            {credentials.map((cred) => (
              <div
                key={cred.id}
                className="flex items-center justify-between p-3 rounded-lg bg-surface-secondary"
              >
                <div>
                  <p className="text-sm text-content-primary">{cred.name}</p>
                  <p className="text-xs text-content-quaternary">
                    {cred.type.replace(/_/g, " ")}
                    {cred.expiration_date &&
                      ` · Exp: ${new Date(cred.expiration_date).toLocaleDateString()}`}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${
                    cred.status === "active"
                      ? "bg-green-500/20 text-green-400 border-green-500/30"
                      : cred.status === "expiring_soon"
                        ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/30"
                        : "bg-red-500/20 text-red-400 border-red-500/30"
                  }`}
                >
                  {cred.status.replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active Jobs */}
      {activeJobs.length > 0 && (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-5">
          <h2 className="text-base font-semibold text-content-primary mb-3">
            {t("activeJobs")}
          </h2>
          <div className="space-y-2">
            {activeJobs.map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-3 rounded-lg bg-surface-secondary"
              >
                <div className="min-w-0">
                  <p className="text-sm text-content-primary truncate">
                    {job.property_name ?? job.description ?? "Work Order"}
                  </p>
                  <p className="text-xs text-content-quaternary">
                    {job.trade} · {job.status.replace(/_/g, " ")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Job History */}
      <div className="bg-surface-primary rounded-xl border border-edge-primary p-5">
        <h2 className="text-base font-semibold text-content-primary mb-3">
          {t("detail.jobHistory")} ({completedJobs.length})
        </h2>
        {completedJobs.length === 0 ? (
          <p className="text-sm text-content-tertiary">{t("noJobHistory")}</p>
        ) : (
          <div className="space-y-2">
            {completedJobs.slice(0, 20).map((job) => (
              <div
                key={job.id}
                className="flex items-center justify-between p-3 rounded-lg bg-surface-secondary"
              >
                <div className="min-w-0">
                  <p className="text-sm text-content-primary truncate">
                    {job.property_name ?? job.description ?? "Work Order"}
                  </p>
                  <p className="text-xs text-content-quaternary">
                    {job.trade} · {new Date(job.created_at).toLocaleDateString()}
                  </p>
                </div>
                <span className="text-xs text-green-400 font-medium">
                  {job.status.replace(/_/g, " ")}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
