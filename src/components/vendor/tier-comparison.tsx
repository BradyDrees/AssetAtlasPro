"use client";

import { useTranslations } from "next-intl";

interface TierSection {
  id: string;
  name: string;
  tier: string | null;
  subtotal: number;
  items: Array<{
    id: string;
    description: string;
    quantity: number;
    unit_price: number;
    total: number;
  }>;
}

interface TierComparisonProps {
  sections: TierSection[];
}

const TIER_COLORS: Record<string, { bg: string; border: string; text: string; label: string }> = {
  good: { bg: "bg-blue-500/10", border: "border-blue-500/30", text: "text-blue-400", label: "Good" },
  better: { bg: "bg-brand-500/10", border: "border-brand-500/30", text: "text-brand-400", label: "Better" },
  best: { bg: "bg-gold-500/10", border: "border-gold-500/30", text: "text-gold-400", label: "Best" },
};

export function TierComparison({ sections }: TierComparisonProps) {
  const t = useTranslations("vendor.estimates");

  const tiers: Record<string, TierSection[]> = { good: [], better: [], best: [] };
  for (const section of sections) {
    const tier = section.tier ?? "good";
    if (tiers[tier]) tiers[tier].push(section);
  }

  const tierTotals: Record<string, number> = {};
  for (const [tier, secs] of Object.entries(tiers)) {
    tierTotals[tier] = secs.reduce((sum, s) => sum + Number(s.subtotal), 0);
  }

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-content-primary">
        {t("tierComparison")}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(["good", "better", "best"] as const).map((tier) => {
          const colors = TIER_COLORS[tier];
          const tierSections = tiers[tier];

          return (
            <div
              key={tier}
              className={`rounded-xl border ${colors.border} ${colors.bg} p-4`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className={`text-sm font-semibold ${colors.text} uppercase`}>
                  {t(`tiers.${tier}`)}
                </h3>
                <span className={`text-lg font-bold ${colors.text}`}>
                  ${tierTotals[tier].toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </span>
              </div>

              {tierSections.length === 0 ? (
                <p className="text-xs text-content-quaternary">{t("tierNoSections")}</p>
              ) : (
                <div className="space-y-2">
                  {tierSections.map((section) => (
                    <div key={section.id}>
                      <p className="text-xs font-medium text-content-secondary">{section.name}</p>
                      <div className="mt-1 space-y-0.5">
                        {section.items.map((item) => (
                          <div key={item.id} className="flex justify-between text-[11px]">
                            <span className="text-content-tertiary truncate mr-2">{item.description}</span>
                            <span className="text-content-secondary shrink-0">
                              ${Number(item.total).toFixed(2)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
