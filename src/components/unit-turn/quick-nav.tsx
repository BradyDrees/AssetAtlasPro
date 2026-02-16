"use client";

import type { UnitTurnCategory } from "@/lib/unit-turn-types";
import { toTitleCase } from "@/lib/utils";

interface QuickNavProps {
  categories: UnitTurnCategory[];
}

export function QuickNav({ categories }: QuickNavProps) {
  return (
    <div className="sticky top-0 z-10 bg-gray-100/95 backdrop-blur-sm -mx-4 px-4 py-2.5 md:-mx-6 md:px-6 border-b border-gray-200 shadow-sm mb-5">
      <div className="flex gap-2 overflow-x-auto pb-0.5 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat.slug}
            onClick={() => {
              document.getElementById(`cat-${cat.slug}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            className="flex-shrink-0 px-4 py-2.5 text-sm font-semibold border rounded-full bg-white border-gray-200 text-gray-700 hover:bg-orange-50 hover:border-orange-300 transition-all"
          >
            {toTitleCase(cat.name.split(" – ")[0])}
          </button>
        ))}
      </div>
    </div>
  );
}
