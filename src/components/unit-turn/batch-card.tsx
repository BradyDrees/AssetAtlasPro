"use client";

import { useTranslations } from "next-intl";
import Link from "next/link";
import { useAppLocale } from "@/components/locale-provider";
import { BATCH_STATUS_LABELS } from "@/lib/unit-turn-constants";
import type { UnitTurnBatch } from "@/lib/unit-turn-types";

interface BatchCardProps {
  batch: UnitTurnBatch;
  unitCount: number;
}

export function BatchCard({ batch, unitCount }: BatchCardProps) {
  const t = useTranslations();
  const { locale } = useAppLocale();
  const statusInfo = BATCH_STATUS_LABELS[batch.status] ?? BATCH_STATUS_LABELS.OPEN;

  const monthLabel = batch.month
    ? new Date(batch.month + "T00:00:00").toLocaleDateString(locale === "es" ? "es" : "en-US", { month: "long", day: "numeric", year: "numeric" })
    : null;

  return (
    <Link
      href={`/unit-turns/${batch.id}`}
      className="block bg-surface-primary rounded-xl border border-edge-primary p-4 hover:shadow-md hover:border-brand-300 transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-content-primary truncate">
              {batch.name}
            </h3>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusInfo.color}`}>
              {t(`unitTurn.batchStatus.${batch.status}`)}
            </span>
          </div>
          <div className="flex items-center gap-3 mt-1">
            {monthLabel && (
              <span className="text-sm text-content-quaternary">{monthLabel}</span>
            )}
            <span className="text-sm text-content-muted">
              {unitCount} {t("pdf.tableHeaders.unit")}
            </span>
          </div>
        </div>
        <span className="text-content-muted text-lg ml-2">→</span>
      </div>
    </Link>
  );
}
