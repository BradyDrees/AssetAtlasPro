/**
 * Canonical seasonal maintenance tasks.
 * Each task defines when it's visible and what property types it applies to.
 */

export interface SeasonalTask {
  id: string;
  season: "spring" | "summer" | "fall" | "winter";
  /** Inclusive month range (1-12). Winter wraps: [12, 1, 2] */
  months: number[];
  titleKey: string;
  descKey: string;
  system_type?: string;
  /** If set, only show for these property types. null = show for all. */
  property_types?: string[] | null;
  /** Optional trade to pre-fill in WO wizard */
  trade?: string;
}

export const SEASONAL_TASKS: SeasonalTask[] = [
  // ─── Spring (Mar–May) ──────────────────────────────────
  {
    id: "spring-ac-service",
    season: "spring",
    months: [3, 4, 5],
    titleKey: "springAcServiceTitle",
    descKey: "springAcServiceDesc",
    system_type: "hvac",
    trade: "hvac",
  },
  {
    id: "spring-gutter-clean",
    season: "spring",
    months: [3, 4, 5],
    titleKey: "springGutterCleanTitle",
    descKey: "springGutterCleanDesc",
    trade: "general",
  },
  {
    id: "spring-deck-inspect",
    season: "spring",
    months: [3, 4, 5],
    titleKey: "springDeckInspectTitle",
    descKey: "springDeckInspectDesc",
    property_types: ["sfr", "townhouse"],
    trade: "general",
  },
  {
    id: "spring-sprinkler-startup",
    season: "spring",
    months: [3, 4, 5],
    titleKey: "springSprinklerTitle",
    descKey: "springSprinklerDesc",
    system_type: "sprinkler",
    property_types: ["sfr"],
    trade: "landscaping",
  },
  {
    id: "spring-pest-inspect",
    season: "spring",
    months: [3, 4, 5],
    titleKey: "springPestTitle",
    descKey: "springPestDesc",
    trade: "pest_control",
  },

  // ─── Summer (Jun–Aug) ──────────────────────────────────
  {
    id: "summer-irrigation-check",
    season: "summer",
    months: [6, 7, 8],
    titleKey: "summerIrrigationTitle",
    descKey: "summerIrrigationDesc",
    system_type: "sprinkler",
    property_types: ["sfr"],
    trade: "landscaping",
  },
  {
    id: "summer-pest-prevention",
    season: "summer",
    months: [6, 7, 8],
    titleKey: "summerPestTitle",
    descKey: "summerPestDesc",
    trade: "pest_control",
  },
  {
    id: "summer-ac-filter",
    season: "summer",
    months: [6, 7, 8],
    titleKey: "summerAcFilterTitle",
    descKey: "summerAcFilterDesc",
    system_type: "hvac",
    trade: "hvac",
  },
  {
    id: "summer-pool-maintenance",
    season: "summer",
    months: [6, 7, 8],
    titleKey: "summerPoolTitle",
    descKey: "summerPoolDesc",
    system_type: "pool",
    property_types: ["sfr"],
    trade: "pool",
  },
  {
    id: "summer-garage-door",
    season: "summer",
    months: [6, 7, 8],
    titleKey: "summerGarageDoorTitle",
    descKey: "summerGarageDoorDesc",
    system_type: "garage_door",
    property_types: ["sfr", "townhouse"],
    trade: "general",
  },

  // ─── Fall (Sep–Nov) ────────────────────────────────────
  {
    id: "fall-furnace-tuneup",
    season: "fall",
    months: [9, 10, 11],
    titleKey: "fallFurnaceTitle",
    descKey: "fallFurnaceDesc",
    system_type: "hvac",
    trade: "hvac",
  },
  {
    id: "fall-weatherstrip",
    season: "fall",
    months: [9, 10, 11],
    titleKey: "fallWeatherstripTitle",
    descKey: "fallWeatherstripDesc",
    trade: "general",
  },
  {
    id: "fall-chimney-inspect",
    season: "fall",
    months: [9, 10, 11],
    titleKey: "fallChimneyTitle",
    descKey: "fallChimneyDesc",
    property_types: ["sfr", "townhouse"],
    trade: "general",
  },
  {
    id: "fall-gutter-clean",
    season: "fall",
    months: [9, 10, 11],
    titleKey: "fallGutterCleanTitle",
    descKey: "fallGutterCleanDesc",
    trade: "general",
  },
  {
    id: "fall-sprinkler-winterize",
    season: "fall",
    months: [9, 10, 11],
    titleKey: "fallSprinklerTitle",
    descKey: "fallSprinklerDesc",
    system_type: "sprinkler",
    property_types: ["sfr"],
    trade: "landscaping",
  },

  // ─── Winter (Dec–Feb) ──────────────────────────────────
  {
    id: "winter-pipe-insulation",
    season: "winter",
    months: [12, 1, 2],
    titleKey: "winterPipeTitle",
    descKey: "winterPipeDesc",
    system_type: "plumbing",
    trade: "plumbing",
  },
  {
    id: "winter-roof-ice-check",
    season: "winter",
    months: [12, 1, 2],
    titleKey: "winterRoofIceTitle",
    descKey: "winterRoofIceDesc",
    system_type: "roof",
    trade: "roofing",
  },
  {
    id: "winter-hvac-filter",
    season: "winter",
    months: [12, 1, 2],
    titleKey: "winterHvacFilterTitle",
    descKey: "winterHvacFilterDesc",
    system_type: "hvac",
    trade: "hvac",
  },
  {
    id: "winter-water-heater-flush",
    season: "winter",
    months: [12, 1, 2],
    titleKey: "winterWaterHeaterTitle",
    descKey: "winterWaterHeaterDesc",
    system_type: "water_heater",
    trade: "plumbing",
  },
  {
    id: "winter-emergency-kit",
    season: "winter",
    months: [12, 1, 2],
    titleKey: "winterEmergencyKitTitle",
    descKey: "winterEmergencyKitDesc",
  },
];

/**
 * Get the season_year for a given date.
 * Winter Dec 2026–Feb 2027 = season_year: 2026 (labeled by starting year).
 */
export function getSeasonYear(date: Date): number {
  const month = date.getMonth() + 1; // 1-12
  const year = date.getFullYear();
  // Jan/Feb belong to previous winter
  if (month <= 2) return year - 1;
  return year;
}

/**
 * Get current season from month.
 */
export function getCurrentSeason(month: number): "spring" | "summer" | "fall" | "winter" {
  if (month >= 3 && month <= 5) return "spring";
  if (month >= 6 && month <= 8) return "summer";
  if (month >= 9 && month <= 11) return "fall";
  return "winter";
}
