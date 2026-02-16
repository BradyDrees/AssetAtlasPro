// ============================================
// Unit Turns Module — Type Definitions
// ============================================

// ----- Enums -----

export type BatchStatus = "OPEN" | "CLOSED";

export type UnitStatus = "NOT_STARTED" | "IN_PROGRESS" | "COMPLETE";

export type ItemStatus = "good" | "repair" | "replace";

export type PaintScope = "touch_up" | "full";

export type CategoryType = "standard" | "paint" | "cleaning";

export type ComplexityType = "fixed" | "tiered";

export type Tier = "light" | "standard" | "heavy";

// ----- Core Interfaces -----

export interface UnitTurnBatch {
  id: string;
  owner_id: string;
  name: string;
  month: string | null;
  status: BatchStatus;
  created_at: string;
  updated_at: string;
}

export interface UnitTurnBatchUnit {
  id: string;
  batch_id: string;
  owner_id: string;
  property: string;
  unit_label: string;
  status: UnitStatus;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface UnitTurnCategory {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  category_type: CategoryType;
  created_at: string;
}

export interface UnitTurnTemplateItem {
  id: string;
  category_id: string;
  name: string;
  sort_order: number;
  complexity_type: ComplexityType;
  created_at: string;
}

export interface UnitTurnUnitItem {
  id: string;
  unit_id: string;
  template_item_id: string;
  category_id: string;
  status: ItemStatus | null;
  is_na: boolean;
  paint_scope: PaintScope | null;
  tier: Tier | null;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface UnitTurnNote {
  id: string;
  unit_id: string;
  item_id: string | null;
  category_id: string;
  text: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export type NotePhotoFileType = "image" | "video";

export interface UnitTurnNotePhoto {
  id: string;
  note_id: string;
  image_path: string;
  file_type: NotePhotoFileType;
  sort_order: number;
  created_at: string;
}

// ----- Joined / Composite Types -----

export interface UnitTurnUnitItemWithTemplate extends UnitTurnUnitItem {
  template_item: UnitTurnTemplateItem;
}

export interface UnitTurnNoteWithPhotos extends UnitTurnNote {
  photos: UnitTurnNotePhoto[];
}

/** Category with its items and notes — used on the unit detail page */
export interface UnitTurnCategoryData {
  category: UnitTurnCategory;
  items: UnitTurnUnitItemWithTemplate[];
  notes: UnitTurnNoteWithPhotos[];
}

/** Unit with item progress stats — used on batch detail page */
export interface UnitTurnBatchUnitWithProgress extends UnitTurnBatchUnit {
  total_items: number;
  assessed_items: number; // items with status set or is_na
}

// ----- Form Types -----

export type CreateBatch = {
  name: string;
  month?: string | null;
};

export type AddUnitToBatch = {
  batch_id: string;
  property: string;
  unit_label: string;
};

export type CreateNote = {
  unit_id: string;
  item_id?: string | null;
  category_id: string;
  text: string;
};
