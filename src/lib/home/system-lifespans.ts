/**
 * Canonical system lifespan constants (in years).
 * Used by health score computation and maintenance alerts.
 */
export const SYSTEM_LIFESPANS: Record<string, number> = {
  hvac: 15,
  roof: 25,
  water_heater: 12,
  electrical_panel: 30,
};

/**
 * Weights for overall health score computation.
 * Must sum to 1.0.
 */
export const SYSTEM_WEIGHTS: Record<string, number> = {
  hvac: 0.25,
  roof: 0.25,
  water_heater: 0.20,
  electrical_panel: 0.15,
  other: 0.15,
};
