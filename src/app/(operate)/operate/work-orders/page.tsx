import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getPmWorkOrders } from "@/app/actions/pm-work-orders";
import { StatusBadge } from "@/components/vendor/status-badge";
import { PriorityDot } from "@/components/vendor/priority-dot";

export default async function OperateWorkOrdersPage() {
  const t = await getTranslations();
  const { data: workOrders } = await getPmWorkOrders();

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-content-primary">
          {t("nav.workOrders")}
        </h1>
        <Link
          href="/operate/work-orders/new"
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors"
        >
          + {t("common.create")}
        </Link>
      </div>

      {workOrders.length === 0 ? (
        <div className="bg-surface-primary rounded-xl border border-edge-primary p-12 text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-content-quaternary opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.384 3.324a.75.75 0 01-1.15-.79l1.27-6.077-4.6-4.065a.75.75 0 01.416-1.28l6.24-.665L11.013.309a.75.75 0 01.064-.064M11.42 15.17l2.496-2.496" />
          </svg>
          <p className="text-sm text-content-tertiary">{t("dashboard.noWorkOrders")}</p>
          <Link
            href="/operate/work-orders/new"
            className="inline-block mt-3 text-sm font-medium text-green-500 hover:text-green-400"
          >
            {t("dashboard.createFirstWo")}
          </Link>
        </div>
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
                    {new Date(wo.created_at).toLocaleDateString()}
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
