import { SYSTEM_LIFESPANS, SYSTEM_WEIGHTS } from "./system-lifespans";

// ─── Types ────────────────────────────────────────────────

export type HealthGrade = "A" | "B" | "C" | "D" | "F";
export type HealthConfidence = "high" | "medium" | "low";

export interface SystemBreakdown {
  system: string;
  score: number; // 0-100
  age: number | null;
  lifespan: number;
  known: boolean;
  hasPhotos: boolean;
  hasDocs: boolean;
  hasRecentWo: boolean;
}

export interface HealthScoreResult {
  overall: number; // 0-100
  breakdown: SystemBreakdown[];
  grade: HealthGrade;
  confidence: HealthConfidence;
}

// ─── Input types ──────────────────────────────────────────

export interface PropertySystemData {
  hvac_age: number | null;
  water_heater_age: number | null;
  roof_age: number | null;
  /** No age column — electrical is always "unknown" unless manually set */
  electrical_panel_age?: number | null;
}

export interface SystemExtras {
  /** system_type values that have at least one photo */
  systemsWithPhotos: string[];
  /** system_type values that have at least one document */
  systemsWithDocs: string[];
  /** system_type values that have a completed WO within 180 days */
  systemsWithRecentWo: string[];
}

export interface ActiveAlert {
  system_type: string;
}

// ─── Pure computation ─────────────────────────────────────

/**
 * Compute the Home Health Score.
 * Pure function — no side effects, no DB calls.
 */
export function computeHealthScore(
  property: PropertySystemData,
  extras: SystemExtras,
  activeAlerts: ActiveAlert[]
): HealthScoreResult {
  const systems = [
    { key: "hvac", age: property.hvac_age },
    { key: "roof", age: property.roof_age },
    { key: "water_heater", age: property.water_heater_age },
    { key: "electrical_panel", age: property.electrical_panel_age ?? null },
  ];

  const alertSet = new Set(activeAlerts.map((a) => a.system_type));
  let knownCount = 0;

  const breakdown: SystemBreakdown[] = systems.map(({ key, age }) => {
    const lifespan = SYSTEM_LIFESPANS[key] ?? 20;
    const known = age !== null && age !== undefined;
    if (known) knownCount++;

    // Base score: 100 - (age/lifespan * 100), clamped 0-100
    let score: number;
    if (known) {
      score = Math.max(0, Math.min(100, 100 - (age! / lifespan) * 100));
    } else {
      score = 50; // neutral for unknown systems
    }

    const hasPhotos = extras.systemsWithPhotos.includes(key);
    const hasDocs = extras.systemsWithDocs.includes(key);
    const hasRecentWo = extras.systemsWithRecentWo.includes(key);

    // Bonuses
    if (hasPhotos) score = Math.min(100, score + 5);
    if (hasDocs) score = Math.min(100, score + 5);
    if (hasRecentWo) score = Math.min(100, score + 10);

    // Penalty for active alert
    if (alertSet.has(key)) score = Math.max(0, score - 20);

    return {
      system: key,
      score: Math.round(score),
      age: known ? age : null,
      lifespan,
      known,
      hasPhotos,
      hasDocs,
      hasRecentWo,
    };
  });

  // "Other" system — average of known system scores or 50 if none
  const knownScores = breakdown.filter((b) => b.known).map((b) => b.score);
  const otherScore =
    knownScores.length > 0
      ? Math.round(knownScores.reduce((a, b) => a + b, 0) / knownScores.length)
      : 50;

  // Weighted overall score
  let overall = 0;
  for (const b of breakdown) {
    const weight = SYSTEM_WEIGHTS[b.system] ?? 0;
    overall += b.score * weight;
  }
  overall += otherScore * (SYSTEM_WEIGHTS.other ?? 0.15);
  overall = Math.round(overall);

  // Grade
  const grade = gradeFromScore(overall);

  // Confidence
  const confidence: HealthConfidence =
    knownCount >= 4
      ? "high"
      : knownCount >= 2
        ? "medium"
        : "low";

  return { overall, breakdown, grade, confidence };
}

function gradeFromScore(score: number): HealthGrade {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}
