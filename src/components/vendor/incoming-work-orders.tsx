"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { IncomingWorkOrder } from "@/app/actions/vendor-dashboard";

interface IncomingWorkOrdersProps {
  orders: IncomingWorkOrder[];
}

const priorityColors: Record<string, string> = {
  normal: "bg-content-quaternary/20 text-content-tertiary",
  urgent: "bg-yellow-500/20 text-yellow-400",
  emergency: "bg-red-500/20 text-red-400",
};

export function IncomingWorkOrders({ orders }: IncomingWorkOrdersProps) {
  const dt = useTranslations("vendor.dashboard");

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-content-primary">
          {dt("sections.incomingWork")}
        </h2>
        <Link
          href="/vendor/jobs"
          className="text-xs text-brand-400 hover:text-brand-300 font-medium"
        >
          {dt("actions.viewAll")}
        </Link>
      </div>

      {orders.length === 0 ? (
        <p className="text-sm text-content-tertiary">{dt("empty.noIncoming")}</p>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
          {orders.map((wo) => (
            <Link
              key={wo.id}
              href={`/vendor/jobs/${wo.id}`}
              className="flex-shrink-0 w-56 bg-surface-secondary rounded-lg border border-edge-secondary p-3 hover:border-edge-primary transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                {wo.vendor_selection_mode === "homeowner_choice" && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-500/20 text-indigo-400">
                    {dt("bidRequest")}
                  </span>
                )}
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${
                    priorityColors[wo.priority] ?? priorityColors.normal
                  }`}
                >
                  {wo.priority}
                </span>
                {wo.trade && (
                  <span className="text-[10px] text-content-quaternary">{wo.trade}</span>
                )}
              </div>
              <p className="text-sm font-medium text-content-primary truncate">
                {wo.property_name ?? wo.description}
              </p>
              {wo.pm_name && (
                <p className="text-xs text-content-quaternary mt-1">{wo.pm_name}</p>
              )}
              <p className="text-[10px] text-content-quaternary mt-1">
                {new Date(wo.created_at).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
