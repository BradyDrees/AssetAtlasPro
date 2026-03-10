"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import type { DashboardProperty } from "@/app/actions/home-dashboard";

interface Props {
  property: DashboardProperty | null;
}

/** Expected lifespans for system age warnings */
const LIFESPAN: Record<string, number> = {
  hvac: 17,
  water_heater: 10,
  roof: 25,
};

function AgeChip({ label, age, lifespan }: { label: string; age: number | null; lifespan: number }) {
  if (age == null) return null;
  const warn = age > lifespan;
  return (
    <div className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs ${
      warn ? "bg-amber-500/10 text-amber-400" : "bg-surface-secondary text-content-tertiary"
    }`}>
      <span className="font-medium">{label}</span>
      <span>{age} yrs</span>
      {warn && (
        <svg className="w-3 h-3 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.168 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 6a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 6zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      )}
    </div>
  );
}

export function DashboardPropertyCard({ property }: Props) {
  const t = useTranslations("home.dashboard");

  if (!property) {
    return (
      <div className="text-center py-6 text-content-quaternary">
        <svg className="w-10 h-10 mx-auto mb-2 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" />
        </svg>
        <p className="text-sm">{t("propertyInfoPlaceholder")}</p>
      </div>
    );
  }

  const TYPE_LABELS: Record<string, string> = {
    sfr: t("sfr"),
    condo: t("condo"),
    townhouse: t("townhouse"),
    duplex: t("duplex"),
  };

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-lg bg-rose-500/10 flex items-center justify-center">
          <svg className="w-5 h-5 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205l3 1m1.5.5l-1.5-.5M6.75 7.364V3h-3v18m3-13.636l10.5-3.819" />
          </svg>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-content-primary truncate">{property.address}</p>
          <p className="text-xs text-content-quaternary">
            {[property.city, property.state].filter(Boolean).join(", ")}
            {property.property_type ? ` · ${TYPE_LABELS[property.property_type] ?? property.property_type}` : ""}
          </p>
        </div>
      </div>

      {/* System age chips */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <AgeChip label={t("systemHvac")} age={property.hvac_age} lifespan={LIFESPAN.hvac} />
        <AgeChip label={t("systemWater")} age={property.water_heater_age} lifespan={LIFESPAN.water_heater} />
        <AgeChip label={t("systemRoof")} age={property.roof_age} lifespan={LIFESPAN.roof} />
        {property.electrical_panel && (
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs bg-surface-secondary text-content-tertiary">
            <span className="font-medium">{t("systemElectrical")}</span>
            <span>{property.electrical_panel}</span>
          </div>
        )}
      </div>

      <Link
        href="/home/property"
        className="text-xs text-rose-500 hover:text-rose-400 font-medium"
      >
        {t("editProperty")} →
      </Link>
    </div>
  );
}
