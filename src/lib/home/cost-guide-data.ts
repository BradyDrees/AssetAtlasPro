/**
 * Static cost guide data for common home repairs.
 * Prices are US national averages (2025).
 */
export interface CostGuideEntry {
  trade: string;
  repairType: string;
  titleKey: string;
  lowEstimate: number;
  highEstimate: number;
  avgDuration: string; // e.g. "1-2 hours"
  notesKey?: string;
}

export const COST_GUIDES: CostGuideEntry[] = [
  // ─── Plumbing ─────────────────────────────────
  { trade: "plumbing", repairType: "faucet_repair", titleKey: "plumbingFaucet", lowEstimate: 150, highEstimate: 300, avgDuration: "1-2 hrs" },
  { trade: "plumbing", repairType: "drain_clearing", titleKey: "plumbingDrain", lowEstimate: 100, highEstimate: 250, avgDuration: "1-2 hrs" },
  { trade: "plumbing", repairType: "water_heater_replace", titleKey: "plumbingWaterHeater", lowEstimate: 800, highEstimate: 2000, avgDuration: "4-6 hrs" },
  { trade: "plumbing", repairType: "toilet_repair", titleKey: "plumbingToilet", lowEstimate: 100, highEstimate: 350, avgDuration: "1-2 hrs" },
  { trade: "plumbing", repairType: "pipe_repair", titleKey: "plumbingPipe", lowEstimate: 200, highEstimate: 600, avgDuration: "2-4 hrs" },
  { trade: "plumbing", repairType: "garbage_disposal", titleKey: "plumbingDisposal", lowEstimate: 150, highEstimate: 400, avgDuration: "1-2 hrs" },

  // ─── Electrical ───────────────────────────────
  { trade: "electrical", repairType: "outlet_install", titleKey: "electricalOutlet", lowEstimate: 150, highEstimate: 300, avgDuration: "1-2 hrs" },
  { trade: "electrical", repairType: "panel_upgrade", titleKey: "electricalPanel", lowEstimate: 1500, highEstimate: 3000, avgDuration: "6-10 hrs" },
  { trade: "electrical", repairType: "ceiling_fan", titleKey: "electricalFan", lowEstimate: 150, highEstimate: 350, avgDuration: "1-3 hrs" },
  { trade: "electrical", repairType: "light_fixture", titleKey: "electricalLight", lowEstimate: 100, highEstimate: 250, avgDuration: "1-2 hrs" },
  { trade: "electrical", repairType: "wiring_repair", titleKey: "electricalWiring", lowEstimate: 200, highEstimate: 800, avgDuration: "2-6 hrs" },

  // ─── HVAC ─────────────────────────────────────
  { trade: "hvac", repairType: "tune_up", titleKey: "hvacTuneUp", lowEstimate: 100, highEstimate: 200, avgDuration: "1-2 hrs" },
  { trade: "hvac", repairType: "compressor_replace", titleKey: "hvacCompressor", lowEstimate: 1500, highEstimate: 3500, avgDuration: "4-8 hrs" },
  { trade: "hvac", repairType: "duct_cleaning", titleKey: "hvacDuct", lowEstimate: 300, highEstimate: 600, avgDuration: "3-5 hrs" },
  { trade: "hvac", repairType: "thermostat_install", titleKey: "hvacThermostat", lowEstimate: 150, highEstimate: 400, avgDuration: "1-2 hrs" },
  { trade: "hvac", repairType: "refrigerant_recharge", titleKey: "hvacRefrigerant", lowEstimate: 200, highEstimate: 500, avgDuration: "1-2 hrs" },

  // ─── Roofing ──────────────────────────────────
  { trade: "roofing", repairType: "leak_repair", titleKey: "roofingLeak", lowEstimate: 300, highEstimate: 1000, avgDuration: "2-4 hrs" },
  { trade: "roofing", repairType: "shingle_replace", titleKey: "roofingShingle", lowEstimate: 200, highEstimate: 600, avgDuration: "2-4 hrs" },
  { trade: "roofing", repairType: "gutter_install", titleKey: "roofingGutter", lowEstimate: 800, highEstimate: 2000, avgDuration: "4-8 hrs" },
  { trade: "roofing", repairType: "full_replacement", titleKey: "roofingFull", lowEstimate: 8000, highEstimate: 15000, avgDuration: "2-5 days" },

  // ─── General / Handyman ───────────────────────
  { trade: "general", repairType: "drywall_patch", titleKey: "generalDrywall", lowEstimate: 100, highEstimate: 300, avgDuration: "1-3 hrs" },
  { trade: "general", repairType: "door_repair", titleKey: "generalDoor", lowEstimate: 100, highEstimate: 250, avgDuration: "1-2 hrs" },
  { trade: "general", repairType: "window_repair", titleKey: "generalWindow", lowEstimate: 150, highEstimate: 500, avgDuration: "1-3 hrs" },
  { trade: "general", repairType: "fence_repair", titleKey: "generalFence", lowEstimate: 200, highEstimate: 600, avgDuration: "2-4 hrs" },

  // ─── Painting ─────────────────────────────────
  { trade: "painting", repairType: "room_interior", titleKey: "paintingRoom", lowEstimate: 200, highEstimate: 600, avgDuration: "4-8 hrs" },
  { trade: "painting", repairType: "exterior", titleKey: "paintingExterior", lowEstimate: 2000, highEstimate: 5000, avgDuration: "2-5 days" },
  { trade: "painting", repairType: "cabinet_refinish", titleKey: "paintingCabinet", lowEstimate: 1200, highEstimate: 3500, avgDuration: "3-7 days" },

  // ─── Appliance ────────────────────────────────
  { trade: "appliance", repairType: "washer_dryer", titleKey: "applianceWasher", lowEstimate: 150, highEstimate: 400, avgDuration: "1-3 hrs" },
  { trade: "appliance", repairType: "dishwasher", titleKey: "applianceDishwasher", lowEstimate: 100, highEstimate: 300, avgDuration: "1-2 hrs" },
  { trade: "appliance", repairType: "refrigerator", titleKey: "applianceFridge", lowEstimate: 200, highEstimate: 500, avgDuration: "1-3 hrs" },

  // ─── Landscaping ──────────────────────────────
  { trade: "landscaping", repairType: "sprinkler_repair", titleKey: "landscapingSprinkler", lowEstimate: 100, highEstimate: 300, avgDuration: "1-3 hrs" },
  { trade: "landscaping", repairType: "tree_removal", titleKey: "landscapingTree", lowEstimate: 500, highEstimate: 2000, avgDuration: "4-8 hrs" },

  // ─── Pest Control ─────────────────────────────
  { trade: "pest_control", repairType: "general_treatment", titleKey: "pestGeneral", lowEstimate: 150, highEstimate: 300, avgDuration: "1-2 hrs" },
  { trade: "pest_control", repairType: "termite_treatment", titleKey: "pestTermite", lowEstimate: 500, highEstimate: 2500, avgDuration: "4-8 hrs" },
];

/**
 * Get cost guides filtered by trade.
 */
export function getCostGuidesForTrade(trade: string): CostGuideEntry[] {
  return COST_GUIDES.filter((g) => g.trade === trade);
}

/**
 * Get all unique trades that have cost guide entries.
 */
export function getCostGuideTrades(): string[] {
  return [...new Set(COST_GUIDES.map((g) => g.trade))];
}
