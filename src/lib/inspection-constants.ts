// ============================================
// Asset Atlas Pro — Inspection Mode Constants
// ============================================

import type {
  PriorityLevel,
  ExposureBucket,
  RulBucket,
  RiskFlag,
  InspectionUnitGrade,
} from "./inspection-types";

// ----- Priority Scale (5-level, industry standard) -----
export const PRIORITY_LABELS: Record<
  PriorityLevel,
  { label: string; timeline: string; color: string; bgColor: string }
> = {
  1: {
    label: "Immediate",
    timeline: "Fix now — safety/code",
    color: "text-red-700",
    bgColor: "bg-red-100 text-red-700",
  },
  2: {
    label: "Urgent",
    timeline: "0–3 months",
    color: "text-orange-700",
    bgColor: "bg-orange-100 text-orange-700",
  },
  3: {
    label: "Short-term",
    timeline: "3–6 months",
    color: "text-yellow-700",
    bgColor: "bg-yellow-100 text-yellow-700",
  },
  4: {
    label: "Planned",
    timeline: "6–12 months",
    color: "text-brand-700",
    bgColor: "bg-brand-100 text-brand-700",
  },
  5: {
    label: "Monitor",
    timeline: "12+ months",
    color: "text-green-700",
    bgColor: "bg-green-100 text-green-700",
  },
};

// "Good / No Issue" option (null priority in DB)
export const GOOD_LABEL = {
  label: "Good",
  timeline: "No issue found",
  color: "text-gray-500",
  bgColor: "bg-gray-100 text-gray-600",
};

// ----- Exposure Tiers -----
export const EXPOSURE_LABELS: Record<ExposureBucket, string> = {
  "500": "$500",
  "1000": "$1,000",
  "2000": "$2,000",
  "3000": "$3,000",
  custom: "Custom",
};

export const EXPOSURE_OPTIONS: ExposureBucket[] = [
  "500",
  "1000",
  "2000",
  "3000",
  "custom",
];

// ----- Risk Flags -----
export const RISK_FLAG_LABELS: Record<
  RiskFlag,
  { label: string; color: string }
> = {
  life_safety: { label: "Life Safety", color: "bg-red-100 text-red-700" },
  water_intrusion: {
    label: "Water Intrusion",
    color: "bg-brand-100 text-brand-700",
  },
  electrical_hazard: {
    label: "Electrical Hazard",
    color: "bg-yellow-100 text-yellow-700",
  },
  structural: { label: "Structural", color: "bg-orange-100 text-orange-700" },
};

export const RISK_FLAG_OPTIONS: RiskFlag[] = [
  "life_safety",
  "water_intrusion",
  "electrical_hazard",
  "structural",
];

// ----- Remaining Useful Life (RUL) -----
export const RUL_OPTIONS: RulBucket[] = [
  "1-3 months",
  "3-6 months",
  "6-12 months",
  "1-3 years",
  "3-5 years",
];

export const RUL_COLORS: Record<RulBucket, string> = {
  "1-3 months": "bg-red-100 text-red-700",
  "3-6 months": "bg-orange-100 text-orange-700",
  "6-12 months": "bg-yellow-100 text-yellow-700",
  "1-3 years": "bg-lime-100 text-lime-700",
  "3-5 years": "bg-green-100 text-green-700",
};

// ----- Condition Rating (1-5, same as DD) -----
export const INSPECTION_CONDITION_LABELS: Record<number, string> = {
  1: "Poor",
  2: "Fair",
  3: "Average",
  4: "Good",
  5: "Excellent",
};

// ----- Unit Grades (A-F for inspection units) -----
export const INSPECTION_UNIT_GRADES: Record<
  InspectionUnitGrade,
  { label: string; color: string; border: string }
> = {
  A: {
    label: "Excellent",
    color: "bg-green-500 text-white",
    border: "border-green-500",
  },
  B: {
    label: "Good",
    color: "bg-lime-500 text-white",
    border: "border-lime-500",
  },
  C: {
    label: "Average",
    color: "bg-yellow-500 text-white",
    border: "border-yellow-500",
  },
  D: {
    label: "Below Average",
    color: "bg-orange-500 text-white",
    border: "border-orange-500",
  },
  E: {
    label: "Poor",
    color: "bg-red-500 text-white",
    border: "border-red-500",
  },
  F: {
    label: "Replace / Critical",
    color: "bg-red-700 text-white",
    border: "border-red-700",
  },
};

// ----- Overall Condition (1-5) -----
export const OVERALL_CONDITION_LABELS: Record<
  number,
  { label: string; color: string }
> = {
  1: { label: "Critical", color: "bg-red-100 text-red-700" },
  2: { label: "Below Average", color: "bg-orange-100 text-orange-700" },
  3: { label: "Average", color: "bg-yellow-100 text-yellow-700" },
  4: { label: "Good", color: "bg-lime-100 text-lime-700" },
  5: { label: "Excellent", color: "bg-green-100 text-green-700" },
};

// ----- Yes/No Options (Leaks, Mold) -----
export const INSPECTION_YES_NO = {
  Yes: { color: "bg-red-500 text-white" },
  No: { color: "bg-green-500 text-white" },
} as const;

// ----- Inspection Type Labels -----
export const INSPECTION_TYPE_LABELS: Record<string, string> = {
  internal: "Internal",
  bank_ready: "Customer (PCA Lite)",
};

// ----- Asset Archetype Labels -----
export const ASSET_ARCHETYPE_LABELS: Record<string, { label: string; unitLabel: string }> = {
  garden: { label: "Garden-Style", unitLabel: "Units" },
  interior: { label: "Interior Corridor", unitLabel: "Units" },
  sfr: { label: "Single-Family Rental", unitLabel: "Homes" },
};

// ----- Occupancy Status -----
export const OCCUPANCY_STATUS_LABELS: Record<
  string,
  { label: string; color: string }
> = {
  VACANT: { label: "Vacant", color: "bg-yellow-100 text-yellow-700" },
  OCCUPIED: { label: "Occupied", color: "bg-green-100 text-green-700" },
  MODEL: { label: "Model", color: "bg-gold-100 text-gold-800" },
  DOWN: { label: "Down", color: "bg-red-100 text-red-700" },
  UNKNOWN: { label: "Unknown", color: "bg-gray-100 text-gray-600" },
};

export const OCCUPANCY_OPTIONS = [
  "VACANT",
  "OCCUPIED",
  "MODEL",
  "DOWN",
  "UNKNOWN",
] as const;

// ----- Walk Status -----
export const WALK_STATUS_LABELS: Record<
  string,
  { label: string; color: string }
> = {
  NOT_STARTED: { label: "Not Started", color: "bg-gray-100 text-gray-600" },
  IN_PROGRESS: { label: "In Progress", color: "bg-brand-100 text-brand-700" },
  COMPLETE: { label: "Complete", color: "bg-green-100 text-green-700" },
  NO_ACCESS: { label: "No Access", color: "bg-red-100 text-red-700" },
};

export const WALK_STATUS_OPTIONS = [
  "NOT_STARTED",
  "IN_PROGRESS",
  "COMPLETE",
  "NO_ACCESS",
] as const;

// ----- Turn Stage -----
export const TURN_STAGE_LABELS: Record<
  string,
  { label: string; color: string }
> = {
  MAKE_READY: { label: "Make Ready", color: "bg-yellow-100 text-yellow-700" },
  RENOVATION: { label: "Renovation", color: "bg-orange-100 text-orange-700" },
  READY: { label: "Ready", color: "bg-green-100 text-green-700" },
  HOLD: { label: "Hold", color: "bg-gray-100 text-gray-600" },
};

export const TURN_STAGE_OPTIONS = [
  "MAKE_READY",
  "RENOVATION",
  "READY",
  "HOLD",
] as const;

// ----- BD/BA Options (reuse from DD) -----
export const INSPECTION_BD_BA_OPTIONS = [
  "0/1",
  "1/1",
  "1/1.5",
  "2/1",
  "2/1.5",
  "2/2",
  "2/2.5",
  "3/1",
  "3/1.5",
  "3/2",
  "3/2.5",
  "3/3",
] as const;

// ----- Appliance Options -----
export const INSPECTION_APPLIANCE_OPTIONS = [
  "Black",
  "White",
  "Stainless Steel",
] as const;
