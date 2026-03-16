import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getPmWorkOrders } from "@/app/actions/pm-work-orders";
import { StatusBadge } from "@/components/vendor/status-badge";
import { PriorityDot } from "@/components/vendor/priority-dot";
import { PageHeader } from "@/components/ui/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate } from "@/lib/format-date";
import { getLocale } from "next-intl/server";

export default async function OperateWorkOrdersPage() {
  const t = await getTranslations();
  const locale = (await getLocale()) as "en" | "es";
  const { data: workOrders } = await getPmWorkOrders();

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <PageHeader
        title={t("nav.workOrders")}
        subtitle={t("dashboard.woDescription")}
        action={
          <Link
            href="/operate/work-orders/new"
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
          >
            + {t("common.create")}
          </Link>
        }
      />

      {workOrders.length === 0 ? (
        <EmptyState
          icon="briefcase"
          title={t("dashboard.noWorkOrders")}
          action={{ label: t("dashboard.createFirstWo"), href: "/operate/work-orders/new" }}
        />
      ) : (
        <div className="space-y-3">
          {workOrders.map((wo) => (
            <Link
              key={wo.id}
              href={`/operate/work-orders/${wo.id}`}
              className="block bg-surface-primary rounded-xl border border-edge-primary p-4 hover:border-green-500/40 transition-colors"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <PriorityDot priority={wo.priority} />
                    <h3 className="text-sm font-semibold text-content-primary truncate">
                      {wo.property_name || wo.description || "Work Order"}
                    </h3>
                  </div>
                  {wo.property_address && (
                    <p className="text-xs text-content-tertiary truncate">
                      {wo.property_address}
                      {wo.unit_number && ` · Unit ${wo.unit_number}`}
                    </p>
                  )}
                  {wo.trade && (
                    <p className="text-xs text-content-quaternary mt-0.5">{wo.trade}</p>
                  )}
                  {wo.description && (
                    <p className="text-xs text-content-tertiary mt-1 line-clamp-2">
                      {wo.description}
                    </p>
                  )}
                  <p className="text-[10px] text-content-quaternary mt-1">
                    {formatDate(wo.created_at, locale, { weekday: false })}
                  </p>
                </div>
                <StatusBadge status={wo.status} size="sm" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
