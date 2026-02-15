// ============================================
// Asset Atlas Pro — Type Definitions
// ============================================

export type ProjectStatus = "DRAFT" | "IN_PROGRESS" | "COMPLETE";

/**
 * Master section template (read from dd_sections table).
 * Shared across all users/projects. Read-only reference data.
 */
export interface DDSection {
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
 * A due diligence inspection project.
 */
export interface DDProject {
  id: string;
  owner_id: string;
  name: string; // short project code, e.g. "VERIDIAN"
  property_name: string; // full property name, e.g. "Veridian Residences"
  address: string;
  status: ProjectStatus;
  created_at: string;
  updated_at: string;
}

/**
 * Per-project section instance (join between project and master section).
 * Controls which sections are enabled for a given project.
 */
export interface DDProjectSection {
  id: string;
  project_id: string;
  section_id: string;
  enabled: boolean;
  sort_order: number;
  notes: string | null;
  condition_rating: number | null;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * ProjectSection joined with its master section data.
 * This is what the UI works with.
 */
export interface DDProjectSectionWithDetails extends DDProjectSection {
  section: DDSection;
}

/**
 * Sections grouped by group_name for UI rendering.
 */
export interface DDSectionGroup {
  group_name: string;
  sections: DDProjectSectionWithDetails[];
}

// ----- Form/mutation types -----

export type CreateDDProject = Pick<
  DDProject,
  "name" | "property_name" | "address"
>;

export type UpdateDDProject = Partial<CreateDDProject>;

// ============================================
// Phase 2: Capture Types
// ============================================

export type CaptureFileType = "image" | "video" | "pdf";

/**
 * A single capture (photo, video, or PDF) within a project section.
 * unit_id is nullable: NULL = section-level capture, non-NULL = unit-level capture.
 */
export interface DDCapture {
  id: string;
  project_section_id: string;
  unit_id: string | null;
  section_item_id: string | null;
  file_type: CaptureFileType;
  image_path: string;
  caption: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type ConditionRating = 1 | 2 | 3 | 4 | 5;

export const CONDITION_LABELS: Record<ConditionRating, string> = {
  1: "Poor",
  2: "Fair",
  3: "Average",
  4: "Good",
  5: "Excellent",
};

// ============================================
// Phase 3: Unit Mode Types
// ============================================

export type TenantGrade = "A" | "B" | "C" | "D" | "E" | "F";
export type UnitGrade = "A" | "B" | "C" | "D" | "E" | "F" | "NK";
export type ItemGrade = "A" | "B" | "C" | "D" | "E" | "F";

/**
 * A single apartment unit within a unit-mode section.
 * Per-unit inspection data: grades, appliances, BD/BA, toggles, notes.
 */
export interface DDUnit {
  id: string;
  project_id: string;
  project_section_id: string;
  building: string;
  unit_number: string;
  bd_ba: string | null;
  appliances: string[];
  tenant_grade: TenantGrade | null;
  unit_grade: UnitGrade | null;
  cabinets: ItemGrade | null;
  countertop: ItemGrade | null;
  flooring: ItemGrade | null;
  has_mold: boolean;
  has_wd_connect: boolean;
  notes: string;
  created_at: string;
  updated_at: string;
}

export type CreateDDUnit = Pick<
  DDUnit,
  "project_id" | "project_section_id" | "building" | "unit_number"
>;

// ============================================
// Section Item Types (Multi-Item Mode)
// ============================================

/**
 * A named inspection item within a non-unit section.
 * e.g., "Building A Roof", "Building B Roof" within "Roofing" section.
 * Each item has its own condition rating, notes, and photos.
 */
export interface DDSectionItem {
  id: string;
  project_section_id: string;
  name: string;
  condition_rating: number | null;
  notes: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export type CreateDDSectionItem = Pick<
  DDSectionItem,
  "project_section_id" | "name"
>;
