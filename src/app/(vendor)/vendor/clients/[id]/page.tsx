import { getClientDetail } from "@/app/actions/vendor-clients";
import { getTranslations } from "next-intl/server";
import Link from "next/link";

export default async function ClientDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const t = await getTranslations("vendor.clients");
  const { client, jobs } = await getClientDetail(id);

  if (!client) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-8 text-center">
          <p className="text-red-400">{t("notFound")}</p>
        </div>
      </div>
    );
  }

  const completedJobs = jobs.filter((j) => ["completed", "invoiced", "paid"].includes(j.status));
  const activeJobs = jobs.filter((j) =>
    ["assigned", "accepted", "scheduled", "en_route", "on_site", "in_progress"].includes(j.status)
  );

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/vendor/clients"
          className="p-1.5 rounded-lg hover:bg-surface-secondary text-content-tertiary"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-content-primary">
            {client.pm_name ?? client.pm_email}
          </h1>
          {client.pm_email && (
            <p className="text-sm text-content-tertiary">{client.pm_email}</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-4 text-center">
          <p className="text-2xl font-bold text-content-primary">{client.total_jobs}</p>
          <p className="text-xs text-content-quaternary">{t("totalJobs")}</p>
        </div>
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-4 text-center">
          <p className="text-2xl font-bold text-brand-400">{client.active_jobs}</p>
          <p className="text-xs text-content-quaternary">{t("activeJobs")}</p>
        </div>
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-4 text-center">
          <p className="text-2xl font-bold text-green-400">
            ${client.total_revenue.toLocaleString("en-US", { minimumFractionDigits: 0 })}
          </p>
          <p className="text-xs text-content-quaternary">{t("totalRevenue")}</p>
        </div>
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-4 text-center">
          <p className="text-2xl font-bold text-content-primary">{client.payment_terms}</p>
          <p className="text-xs text-content-quaternary">{t("paymentTerms")}</p>
        </div>
      </div>

      {/* Active Jobs */}
      {activeJobs.length > 0 && (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-5">
          <h2 className="text-base font-semibold text-content-primary mb-3">{t("activeJobs")}</h2>
          <div className="space-y-2">
            {activeJobs.map((job) => (
              <Link
                key={job.id}
                href={`/vendor/jobs/${job.id}`}
                className="flex items-center justify-between p-3 rounded-lg bg-surface-secondary hover:bg-surface-tertiary transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm text-content-primary truncate">{job.description ?? job.property_name}</p>
                  <p className="text-xs text-content-quaternary">{job.trade} · {job.status}</p>
                </div>
                <svg className="w-4 h-4 text-content-quaternary flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
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
              <Link
                key={job.id}
                href={`/vendor/jobs/${job.id}`}
                className="flex items-center justify-between p-3 rounded-lg bg-surface-secondary hover:bg-surface-tertiary transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm text-content-primary truncate">{job.description ?? job.property_name}</p>
                  <p className="text-xs text-content-quaternary">
                    {job.trade} · {job.completed_at ? new Date(job.completed_at).toLocaleDateString() : job.status}
                  </p>
                </div>
                <span className="text-xs text-green-400 font-medium">{job.status}</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
