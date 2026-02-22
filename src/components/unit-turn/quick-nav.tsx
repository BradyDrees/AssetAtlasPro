"use client";

import { useTranslations } from "next-intl";
import type { UnitTurnCategory } from "@/lib/unit-turn-types";

const categoryKey = (slug: string) => {
  const map: Record<string, string> = {
    "kitchen": "kitchen",
    "bathroom": "bathroom",
    "electrical-fixtures": "electricalFixtures",
    "doors-hardware-windows": "doorsHardwareWindows",
    "flooring-finish": "flooringFinish",
    "mechanical-safety": "mechanicalSafety",
    "laundry": "laundry",
    "paint": "paint",
    "cleaning": "cleaning",
  };
  return map[slug] ?? slug;
};

interface QuickNavProps {
  categories: UnitTurnCategory[];
}

export function QuickNav({ categories }: QuickNavProps) {
  const t = useTranslations();
  return (
    <div className="sticky top-0 z-10 bg-surface-tertiary/95 backdrop-blur-sm -mx-4 px-4 py-2.5 md:-mx-6 md:px-6 border-b border-edge-primary shadow-sm mb-5">
      <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat.slug}
            onClick={() => {
              document.getElementById(`cat-${cat.slug}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="flex-shrink-0 px-4 py-2.5 text-sm font-semibold border rounded-full bg-surface-primary border-edge-primary text-content-secondary hover:bg-brand-50 hover:border-brand-300 transition-all"
          >
            {t(`unitTurn.categories.${categoryKey(cat.slug)}`)}
          </button>
        ))}
      </div>
    </div>
  );
}
