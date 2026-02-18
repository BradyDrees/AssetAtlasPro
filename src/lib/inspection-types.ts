// ============================================
// Asset Atlas Pro — Inspection Mode Type Definitions
// ============================================

import type { ProjectStatus, CaptureFileType } from "./types";

// Re-export shared types for convenience
export type { ProjectStatus, CaptureFileType };

// ----- Inspection-specific enums -----

export type InspectionType = "internal" | "bank_ready";

export type PriorityLevel = 1 | 2 | 3 | 4 | 5;

export type ExposureBucket = "500" | "1000" | "2000" | "3000" | "custom";

export type RulBucket =
  | "1-3 months"
  | "3-6 months"
  | "6-12 months"
  | "1-3 years"
  | "3-5 years";

export type RiskFlag =
  | "life_safety"
  | "water_intrusion"
  | "electrical_hazard"
  | "structural";

export type InspectionUnitGrade = "A" | "B" | "C" | "D" | "E" | "F";

export type OccupancyStatus = "VACANT" | "OCCUPIED" | "MODEL" | "DOWN" | "UNKNOWN";

export type WalkStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE" | "NO_ACCESS";

export type TurnStage = "MAKE_READY" | "RENOVATION" | "READY" | "HOLD";

export type AssetArchetype = "garden" | "interior" | "sfr";

// ----- Master template types -----

/**
 * Master inspection section template (read from inspection_sections table).
 * Shared across all users/projects. Read-only reference data.
 */
export interface InspectionSection {
  id: string;
  group_name: string;
  name: string;
  slug: string;
  sort_order: number;
  is_unit_mode: boolean;
  is_default_enabled: boolean;
  created_at: string;
  updated_at: string;
}

/**
 * Master checklist item template (read from inspection_checklist_items table).
 */
export interface InspectionChecklistItem {
  id: string;
  section_id: string;
  name: string;
  sort_order: number;
  default_required: boolean;
  created_at: string;
  updated_at: string;
}

// ----- Project types -----

/**
 * An inspection project owned by a user.
 */
export interface InspectionProject {
  id: string;
  owner_id: string;
  name: string; // short project code, e.g. "VERIDIAN"
  property_name: string; // full property name
  address: string;
  inspection_type: InspectionType;
  asset_archetype: AssetArchetype;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Per-project section instance (join between project and master section).
 */
export interface InspectionProjectSection {
  id: string;
  project_id: string;
  section_id: string;
  enabled: boolean;
  is_na: boolean;
  sort_order: number;
  display_name_override: string | null;
  condition_rating: number | null;
  rul_bucket: RulBucket | null;
  notes: string | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * ProjectSection joined with its master section data.
 */
export interface InspectionProjectSectionWithDetails
  extends InspectionProjectSection {
  section: InspectionSection;
}

/**
 * Sections grouped by group_name for UI rendering.
 */
export interface InspectionSectionGroup {
  group_name: string;
  sections: InspectionProjectSectionWithDetails[];
}

// ----- Finding types -----

/**
 * A single finding (deficiency) within an inspection section.
 */
export interface InspectionFinding {
  id: string;
  project_id: string;
  project_section_id: string;
  checklist_item_id: string | null;
  unit_id: string | null;
  created_by: string;
  title: string;
  location: string;
  priority: PriorityLevel | null;
  exposure_bucket: ExposureBucket | null;
  exposure_custom: number | null;
  risk_flags: RiskFlag[];
  notes: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ----- Unit types -----

/**
 * A single apartment unit within the unit-mode section.
 */
export interface InspectionUnit {
  id: string;
  project_id: string;
  project_section_id: string;
  building: string;
  unit_number: string;
  // Vacant walk tracking
  occupancy_status: OccupancyStatus;
  walk_status: WalkStatus;
  walk_required: boolean;
  turn_stage: TurnStage | null;
  // Condition grades
  overall_condition: number | null;
  tenant_housekeeping: InspectionUnitGrade | null;
  floors: InspectionUnitGrade | null;
  cabinets: InspectionUnitGrade | null;
  countertops: InspectionUnitGrade | null;
  appliances: string[];
  plumbing_fixtures: InspectionUnitGrade | null;
  electrical_fixtures: InspectionUnitGrade | null;
  windows_doors: InspectionUnitGrade | null;
  bath_condition: InspectionUnitGrade | null;
  has_leak_evidence: boolean;
  has_mold_indicators: boolean;
  blinds_down: boolean;
  toilet_seat_down: boolean;
  rent_ready: boolean | null;
  days_vacant: number | null;
  turn_unit_id: string | null;
  description: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

// ----- Capture types -----

/**
 * A single capture (photo, video, or PDF) within an inspection.
 */
export interface InspectionCapture {
  id: string;
  project_section_id: string;
  finding_id: string | null;
  unit_id: string | null;
  created_by: string;
  file_type: CaptureFileType;
  image_path: string;
  caption: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

// ----- Form/mutation types -----

export type CreateInspectionProject = Pick<
  InspectionProject,
  "name" | "property_name" | "address" | "inspection_type" | "asset_archetype"
>;

export type UpdateInspectionProject = Partial<CreateInspectionProject>;

export type CreateInspectionUnit = Pick<
  InspectionUnit,
  "project_id" | "project_section_id" | "building" | "unit_number"
>;

export type CreateInspectionFinding = Pick<
  InspectionFinding,
  "project_id" | "project_section_id" | "checklist_item_id" | "unit_id" | "title"
>;

// ----- Sharing & Permission types -----

export type ProjectRole = "owner" | "collaborator";

export interface UserProfile {
  id: string;
  email: string;
  full_name: string;
}

export interface InspectionProjectShare {
  id: string;
  project_id: string;
  shared_with_user_id: string;
  shared_by_user_id: string;
  role: string;
  created_at: string;
}

export interface InspectionProjectShareWithProfile extends InspectionProjectShare {
  profile: UserProfile;
}
