"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import type { CatalogItem } from "@/app/actions/vendor-inventory";

interface DashboardInventoryWidgetProps {
  alerts: CatalogItem[];
}

export function DashboardInventoryWidget({ alerts }: DashboardInventoryWidgetProps) {
  const t = useTranslations("vendor.inventory");

  return (
    <div className="bg-surface-primary rounded-xl border border-edge-primary p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-content-primary">
          {t("widget.title")}
        </h2>
        <Link
          href="/vendor/inventory"
          className="text-xs text-brand-600 hover:text-brand-700 font-medium"
        >
          {t("widget.viewAll")}
        </Link>
      </div>

      {alerts.length === 0 ? (
        <div className="flex items-center gap-2 text-content-tertiary">
          <svg className="w-5 h-5 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span className="text-sm">{t("widget.noAlerts")}</span>
        </div>
      ) : (
        <div className="space-y-2">
          {alerts.slice(0, 5).map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between py-2 border-b border-edge-secondary last:border-0"
            >
              <div className="min-w-0 flex-1">
                <p className="text-sm text-content-primary truncate">{item.name}</p>
                {item.sku && (
                  <p className="text-xs text-content-quaternary">{item.sku}</p>
                )}
              </div>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ml-2 ${
                  item.current_stock <= 0
                    ? "bg-red-500/10 text-red-600"
                    : "bg-amber-500/10 text-amber-600"
                }`}
              >
                {item.current_stock} / {item.min_stock}
              </span>
            </div>
          ))}
          {alerts.length > 5 && (
            <p className="text-xs text-content-quaternary text-center pt-1">
              {t("widget.item", { count: alerts.length })}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
