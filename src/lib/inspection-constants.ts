// ============================================
// Asset Atlas Pro — Inspection Mode Constants
// ============================================

import type {
  PriorityLevel,
  ExposureBucket,
  RulBucket,
  RiskFlag,
  InspectionUnitGrade,
  OperationalTag,
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

// ----- Operational Tags (Operate inspections) -----
export const OPERATIONAL_TAG_LABELS: Record<
  OperationalTag,
  { label: string; color: string; i18nKey: string }
> = {
  leasing_impact: { label: "Leasing Impact", color: "bg-orange-100 text-orange-700", i18nKey: "inspection.tags.leasingImpact" },
  property_cleanliness: { label: "Property Cleanliness", color: "bg-blue-100 text-blue-700", i18nKey: "inspection.tags.propertyCleanliness" },
  curb_appeal: { label: "Curb Appeal", color: "bg-green-100 text-green-700", i18nKey: "inspection.tags.curbAppeal" },
  deferred_maintenance: { label: "Deferred Maintenance", color: "bg-yellow-100 text-yellow-700", i18nKey: "inspection.tags.deferredMaintenance" },
  code_violation: { label: "Code Violation", color: "bg-red-100 text-red-700", i18nKey: "inspection.tags.codeViolation" },
  tenant_complaint: { label: "Tenant Complaint", color: "bg-purple-100 text-purple-700", i18nKey: "inspection.tags.tenantComplaint" },
  capital_planning: { label: "Capital Planning", color: "bg-slate-100 text-slate-700", i18nKey: "inspection.tags.capitalPlanning" },
  energy_efficiency: { label: "Energy Efficiency", color: "bg-teal-100 text-teal-700", i18nKey: "inspection.tags.energyEfficiency" },
  ada_compliance: { label: "ADA Compliance", color: "bg-indigo-100 text-indigo-700", i18nKey: "inspection.tags.adaCompliance" },
};

export const OPERATIONAL_TAG_OPTIONS: OperationalTag[] = [
  "leasing_impact",
  "property_cleanliness",
  "curb_appeal",
  "deferred_maintenance",
  "code_violation",
  "tenant_complaint",
  "capital_planning",
  "energy_efficiency",
  "ada_compliance",
];

// ----- Operate Capture Seed Lists -----
export const OPERATE_CATEGORY_SEEDS = [
  "Plumbing", "HVAC", "Electrical", "Roofing", "Flooring", "Paint",
  "Appliances", "Cabinetry", "Windows/Doors", "Exterior", "Common Area",
  "Landscaping", "Pest", "Fire Safety",
] as const;

export const OPERATE_LOCATION_SEEDS = [
  "Lobby", "Hallway", "Stairwell", "Parking", "Pool", "Gym",
  "Laundry", "Office", "Exterior North", "Exterior South",
  "Exterior East", "Exterior West", "Roof", "Basement", "Mechanical Room",
] as const;

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
  pca_lite: "PCA Lite",
  pca: "PCA Inspection",
};

// ----- Tier-Based Inspection Type Configuration -----
import type { InspectionType } from "./inspection-types";

export type InspectionTier = "acquire" | "operate" | "vendor";

export const INSPECTION_TYPES_BY_TIER: Record<InspectionTier, readonly InspectionType[]> = {
  acquire: ["pca", "pca_lite"],
  operate: ["internal"],
  vendor: ["pca_lite"],
} as const;

export const DEFAULT_INSPECTION_TYPE_BY_TIER: Record<InspectionTier, InspectionType> = {
  acquire: "pca",
  operate: "internal",
  vendor: "pca_lite",
};

export const INSPECTION_BASE_PATH_BY_TIER: Record<InspectionTier, string> = {
  acquire: "/inspections",
  operate: "/operate/inspections",
  vendor: "/vendor/inspections",
};

/** Maps DB inspection_type value to its i18n key under inspection.inspectionTypes.* */
export const INSPECTION_TYPE_I18N_KEY: Record<string, string> = {
  internal: "internal",
  pca_lite: "pcaLite",
  pca: "pca",
  bank_ready: "pcaLite", // backward compat for stale data
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
